import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import test from 'node:test';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const requireExternal=createRequire(import.meta.url);
const testDirectory=path.dirname(fileURLToPath(import.meta.url));

function fixture(t) {
  const sqlite = new DatabaseSync(':memory:');t.after(()=>sqlite.close());
  const modules = new Map();let barrier, beforeBatch;
  async function pause(sql) {
    if (!barrier || !barrier.match(sql)) return;
    const current=barrier;current.count++;
    if(current.count===2){barrier=undefined;current.resolve();}
    await current.promise;
  }
  const db={prepare(sql){return {sql,values:[],bind(...values){this.values=values;return this;},async first(){const row=sqlite.prepare(sql).get(...this.values)||null;await pause(sql);return row;},async all(){const results=sqlite.prepare(sql).all(...this.values);await pause(sql);return {results};},async run(){const result=sqlite.prepare(sql).run(...this.values);return {meta:{changes:Number(result.changes)},success:true};}};},
    async batch(statements){
      if(beforeBatch){const hook=beforeBatch;if(hook.match(statements[0]?.sql)){beforeBatch=undefined;hook.run();}}
      sqlite.exec('BEGIN IMMEDIATE');
      try{const result=statements.map(s=>{const value=sqlite.prepare(s.sql).run(...s.values);return {success:true,meta:{changes:Number(value.changes)}};});sqlite.exec('COMMIT');return result;}
      catch(error){sqlite.exec('ROLLBACK');throw error;}
    }};
  const root=process.env.TEST_SOURCE_ROOT || path.join(testDirectory,'..');
  function load(filename){
    const full=path.resolve(root,filename);
    if(modules.has(full))return modules.get(full).exports;
    const compiled={exports:{}};modules.set(full,compiled);
    const code=ts.transpileModule(readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:full})(id=>{
      if(id==='cloudflare:workers')return {env:{DB:db,GOOGLE_GENAI_USE_ENTERPRISE:'False'}};
      if(id.startsWith('@/'))return load(id.slice(2)+'.ts');
      return requireExternal(id);
    },compiled,compiled.exports);
    return compiled.exports;
  }
  const game=load('lib/server/game.ts');
  return {game,sqlite,barrier(match){let resolve;const promise=new Promise(r=>{resolve=r;});barrier={match,count:0,promise,resolve};},before(match,run){beforeBatch={match,run};}};
}
async function propose(f,kind='training') {
  const before=await f.game.getGameState();const known=new Set(before.actions.map(a=>a.id));
  const state=await f.game.proposeAction({kind,intent:kind==='training'?'Начать тренировку':'Тестовое действие'});
  return state.actions.find(a=>!known.has(a.id));
}
async function challenge(f,stake=7000) {
  const action=await propose(f);
  f.sqlite.prepare("UPDATE actions SET kind='challenge',cost_cents=0,energy_cost=0 WHERE id=?").run(action.id);
  const target=f.sqlite.prepare("SELECT name FROM players WHERE id!='demo-alex' LIMIT 1").get();
  f.sqlite.prepare('UPDATE action_payloads SET payload_json=? WHERE action_id=?').run(JSON.stringify({targetName:target.name,userAmountUsdCents:stake}),action.id);
  return action;
}
function balance(f,cents=10000){f.sqlite.prepare("UPDATE wallets SET balance_cents=? WHERE player_id='demo-alex'").run(cents);}
const held=f=>f.sqlite.prepare("SELECT COALESCE(SUM(amount_cents),0) n FROM fund_reservations WHERE player_id='demo-alex' AND status='held'").get().n;

test('parallel foreground confirmations start exactly one action; background remains compatible',async t=>{
  const f=fixture(t),a=await propose(f),b=await propose(f);balance(f,100000);
  f.barrier(sql=>sql.includes('WHERE a.id = ? AND a.player_id = ?'));
  const results=await Promise.allSettled([f.game.confirmAction(a.id),f.game.confirmAction(b.id)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM actions a JOIN action_mechanics m ON m.action_id=a.id WHERE a.status='running' AND m.capacity='foreground'").get().n,1);
  const background=await propose(f,'study');await f.game.confirmAction(background.id);
  assert.equal(f.sqlite.prepare('SELECT status FROM actions WHERE id=?').get(background.id).status,'running');
});
test('simultaneous settlement applies skill evidence exactly once',async t=>{
  const f=fixture(t),a=await propose(f);balance(f,100000);await f.game.confirmAction(a.id);
  f.sqlite.prepare("UPDATE actions SET due_at='2000-01-01T00:00:00.000Z' WHERE id=?").run(a.id);
  const skill=f.sqlite.prepare('SELECT skill_name FROM action_effects WHERE action_id=?').get(a.id).skill_name;
  const before=f.sqlite.prepare('SELECT evidence_count FROM skills WHERE name=?').get(skill)?.evidence_count||0;
  f.barrier(sql=>sql.includes("a.status = 'running' AND a.due_at <="));
  await Promise.all([f.game.getGameState(),f.game.getGameState()]);
  assert.equal(f.sqlite.prepare('SELECT evidence_count FROM skills WHERE name=?').get(skill).evidence_count,before+1);
  await f.game.getGameState();assert.equal(f.sqlite.prepare('SELECT evidence_count FROM skills WHERE name=?').get(skill).evidence_count,before+1);
});
test('competing challenge reservations cannot exceed available funds',async t=>{
  const f=fixture(t),a=await challenge(f),b=await challenge(f);balance(f);
  f.barrier(sql=>sql.includes('WHERE a.id = ? AND a.player_id = ?'));
  const results=await Promise.allSettled([f.game.confirmAction(a.id),f.game.confirmAction(b.id)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(held(f),7000);
  const expense=await propose(f);f.sqlite.prepare('UPDATE actions SET cost_cents=5000 WHERE id=?').run(expense.id);
  await assert.rejects(()=>f.game.confirmAction(expense.id));assert.equal(held(f),7000);
});
test('cancelled challenge and duplicate confirmation create no losing effects',async t=>{
  const f=fixture(t),a=await challenge(f);balance(f);
  const count=()=>f.sqlite.prepare("SELECT COUNT(*) n FROM notifications WHERE category='challenge'").get().n;
  const before=count();
  f.before(sql=>sql.includes("UPDATE actions SET status = 'resolved'")&&sql.includes("status = 'awaiting_confirmation'"),()=>f.sqlite.prepare("UPDATE actions SET status='cancelled',transition_token='cancel-test' WHERE id=?").run(a.id));
  await assert.rejects(()=>f.game.confirmAction(a.id));assert.equal(held(f),0);assert.equal(count(),before);
  const b=await challenge(f);await f.game.confirmAction(b.id);const after=count();
  await f.game.confirmAction(b.id);assert.equal(count(),after);assert.equal(held(f),7000);
});
test('recipient accepts atomically, reserves once, and cannot reverse a completed decision',async t=>{
  const f=fixture(t);await f.game.getGameState();balance(f);
  const insert=f.sqlite.prepare("INSERT INTO notifications(id,player_id,sender_name,category,title,body,status,can_accept,can_reply,payload_json,created_at,updated_at) VALUES(?,'demo-alex','Друг','challenge','Вызов','Тест','unread',1,1,?,'2026-10-23','2026-10-23')");
  for(const id of ['n1','n2'])insert.run(id,JSON.stringify({stakeCents:7000}));
  f.barrier(sql=>sql==='SELECT * FROM notifications WHERE id = ? AND player_id = ?');
  const results=await Promise.allSettled([f.game.respondNotification('n1',{action:'accept'}),f.game.respondNotification('n2',{action:'accept'})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(held(f),7000);
  const winner=f.sqlite.prepare("SELECT id FROM notifications WHERE id IN ('n1','n2') AND status='accepted'").get().id;
  await f.game.respondNotification(winner,{action:'accept'});await f.game.respondNotification(winner,{action:'decline'});
  assert.equal(held(f),7000);assert.equal(f.sqlite.prepare('SELECT status FROM notifications WHERE id=?').get(winner).status,'accepted');
  f.sqlite.prepare('UPDATE notifications SET can_accept=1 WHERE id=?').run(winner);
  await f.game.respondNotification(winner,{action:'reply',reply:'Спасибо за вызов'});
  await f.game.respondNotification(winner,{action:'decline'});
  assert.equal(f.sqlite.prepare('SELECT status FROM notifications WHERE id=?').get(winner).status,'accepted');
  assert.equal(held(f),7000);
});
test('API projection excludes hidden reputation while preserving public and private values',async t=>{
  const f=fixture(t),state=await f.game.getGameState();
  const count=f.sqlite.prepare("SELECT COUNT(*) n FROM reputation_scores WHERE visibility='hidden'").get().n;assert.ok(count>0);
  assert.ok(state.profile.reputations.length>0);assert.ok(state.profile.reputations.every(r=>['public','private'].includes(r.visibility)));
});
