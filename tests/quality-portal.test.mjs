/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/* DX-TRACE | Independent second application: cross-process acceptance tests
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {once} from 'node:events';

const manifest=JSON.parse(await readFile(new URL('../apps/quality-portal/manifest.json',import.meta.url)));
const model=JSON.parse(await readFile(new URL('../examples/quality/model.json',import.meta.url)));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

test('standalone quality frontend reuses shared Core, identity, audit and workflow',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'dx-quality-'));
  const web='http://127.0.0.1:38703';
  const core='http://127.0.0.1:38704';
  const quality='http://127.0.0.1:38705';
  const token=randomBytes(32).toString('hex');
  let coreProcess,appProcess,qualityProcess;
  const run=(entry,vars)=>spawn(process.execPath,[entry],{
    env:{...process.env,...vars},stdio:'inherit'
  });
  async function ready(url,headers={}){
    for(let attempt=0;attempt<80;attempt++){
      try{if((await fetch(url,{headers})).ok)return;}catch{}
      await delay(100);
    }
    throw Error('Not ready: '+url);
  }
  async function stop(child){
    if(child && child.exitCode===null && !child.killed){
      const finished=once(child,'exit');child.kill();await finished;
    }
  }
  function request(route,body,who='owner',key=randomUUID()){
    return fetch(web+'/api/'+route,{
      method:body===undefined?'GET':'POST',
      headers:{
        'x-forwarded-user':who,'x-forwarded-email':who+'@example.test',
        ...(body===undefined?{}:{'content-type':'application/json','idempotency-key':key})
      },
      body:body===undefined?undefined:JSON.stringify(body)
    });
  }
  try{
    assert.deepEqual(manifest.spec.model,model,'portal schema must match the quality model');
    qualityProcess=run('apps/quality-portal/server.mjs',{
      PORT:'38705',BIND_ADDRESS:'127.0.0.1'
    });
    await ready(quality+'/apps/quality/');
    coreProcess=run('selfhost/core-server.mjs',{
      DATA_DIR:join(dir,'data'),PUBLIC_ORIGIN:web,
      PORT:'38704',BIND_ADDRESS:'127.0.0.1',DX_CORE_TOKEN:token
    });
    await ready(core+'/api/health',{'x-dx-core-token':token});
    appProcess=run('selfhost/server.mjs',{
      PUBLIC_ORIGIN:web,PORT:'38703',BIND_ADDRESS:'127.0.0.1',
      DX_CORE_URL:core,DX_CORE_TOKEN:token,DX_QUALITY_PORTAL_URL:quality
    });
    await ready(web+'/api/health');
    const html=await fetch(web+'/apps/quality/');
    assert.equal(html.status,200);
    assert.match(html.headers.get('content-security-policy'),/default-src 'none'/);
    assert.match(await html.text(),/Kiểm soát chất lượng/);
    assert.equal((await fetch(web+'/apps/quality/app.js')).status,200);
    assert.equal((await fetch(web+'/apps/quality/manifest.json')).status,200);
    assert.equal((await fetch(web+'/apps/quality/.env')).status,404);
    assert.equal((await fetch(web+'/apps/quality/../server.mjs')).status,404);
    assert.equal((await fetch(web+'/apps/quality/',{method:'POST'})).status,405);
    assert.equal((await fetch(core+'/api/models')).status,403,'Core must remain private');
    assert.equal((await fetch(web+'/api/models')).status,401,'anonymous API must be denied');

    const initial=await (await request('state')).json();
    assert.equal(initial.me.role,'owner');
    const plan=await (await request('apps/plan',{manifest})).json();
    assert.equal(plan.baseVersion,0);
    assert.deepEqual(plan.rejections,[]);
    const install=await request('apps/install',{manifest,baseVersion:0});
    assert.equal(install.status,200);
    const applications=(await (await request('apps')).json()).applications;
    assert.deepEqual(applications.map(x=>x.id),['quality']);
    assert.equal(applications[0].entrypoint,'/apps/quality/');
    const otherApps=await (await request('apps',undefined,'outsider')).json();
    assert.deepEqual(otherApps.applications,[],'another organization must not enumerate applications');

    const created=await request('models/quality/records',{
      data:{lot:'LOT-QA-001',finding:'Kiểm tra nhiệt độ đạt, chờ xác nhận'}
    });
    assert.equal(created.status,200);
    const record=await created.json();
    assert.equal((await request('models/quality/transition',{
      id:record.id,version:1,target:'submitted'
    })).status,200);
    assert.equal((await request('models/quality/transition',{
      id:record.id,version:2,target:'approved'
    })).status,403,'creator may not approve their own record');
    assert.equal((await request('members',{
      email:'manager@example.test',role:'manager'
    })).status,200);
    assert.equal((await request('models/quality/transition',{
      id:record.id,version:2,target:'approved'
    },'manager')).status,200);
    assert.equal((await request('models/quality/records',undefined,'outsider')).status,404);
    const after=await (await request('models/quality/records')).json();
    assert.equal(after.records[0].status,'approved');
    assert.equal(after.records[0].createdBy,'owner@example.test');
    assert.equal((await (await request('audit-ledger/verify')).json()).valid,true);

    // A failed inspection and the warehouse must commit as a single decision.
    const supplier=await (await request('partners',{name:'Quality supplier',kind:'supplier'})).json();
    const destination=await (await request('partners',{name:'Store',kind:'destination'})).json();
    const lot=await (await request('lots',{code:'QC-LOT',product:'Milk',supplier:supplier.id,quantity:100,unit:'box',expiry:'2099-12-31',location:'A1',min_temp:2,max_temp:8})).json();
    const otherLot=await (await request('lots',{code:'OTHER-QC',product:'Milk',supplier:supplier.id,quantity:10,unit:'box',expiry:'2099-12-31',location:'B1',min_temp:2,max_temp:8})).json();
    const reserved=await (await request('shipments',{lot:lot.id,destination:destination.id,quantity:10})).json();
    async function rejectedRecord(){
      const result=await (await request('models/quality/records',{data:{lot:'QC-LOT',finding:'Temperature outside allowed range'}})).json();
      assert.equal((await request('models/quality/transition',{id:result.id,version:1,target:'submitted'})).status,200);
      assert.equal((await request('models/quality/transition',{id:result.id,version:2,target:'rejected',reason:'Failed independent inspection'},'manager')).status,200);
      return result.id;
    }
    const failed=await rejectedRecord();
    const escalation={version:3,lot:lot.id,severity:'high',reason:'Quarantine after inspection'};
    assert.equal((await request('members',{email:'staff@example.test',role:'warehouse'})).status,200);
    await request('state',undefined,'staff');
    assert.equal((await request('quality/'+failed+'/escalate',escalation,'staff')).status,403);
    assert.equal((await request('quality/'+failed+'/escalate',escalation,'outsider')).status,404);
    assert.equal((await request('quality/'+failed+'/escalate?area=training',escalation)).status,404);
    assert.equal((await request('quality/'+record.id+'/escalate',{...escalation,version:3})).status,409,'approved inspection cannot quarantine');
    assert.equal((await request('quality/'+failed+'/escalate',{...escalation,lot:'unknown'})).status,404);
    assert.equal((await request('quality/'+failed+'/escalate',{...escalation,version:1})).status,409);
    assert.equal((await request('quality/'+failed+'/escalate',{...escalation,lot:otherLot.id})).status,422,'existing different lot cannot be substituted');
    assert.equal((await request('quality/'+failed+'/escalate',{...escalation,reason:''})).status,422);
    const key=randomUUID();
    const outcomes=await Promise.all(Array.from({length:3},()=>request('quality/'+failed+'/escalate',escalation,'manager',key)));
    for(const response of outcomes)assert.equal(response.status,200);
    const linked=await outcomes[0].json();
    assert.equal(linked.reused,false);
    assert.equal((await request('quality/'+failed+'/escalate',{...escalation,reason:'Changed'},'manager',key)).status,409);
    assert.equal((await request('quality/'+failed+'/escalate',escalation,'owner',key)).status,409,'replay is bound to actor');
    const warehouse=await (await request('state')).json();
    assert.equal(warehouse.lots.find(item=>item.id===lot.id).status,'quarantine');
    assert.equal(warehouse.incidents.filter(item=>item.lot===lot.id).length,1);
    assert.equal((await request('shipments',{lot:lot.id,destination:destination.id,quantity:1})).status,409,'new shipment blocked');
    assert.equal((await request('shipments/'+reserved.id+'/deliver',{})).status,409,'existing reservation cannot bypass quarantine');
    const records=await (await request('models/quality/records')).json();
    assert.equal(records.records.find(item=>item.id===failed).warehouseIncident.id,linked.incident);
    const second=await rejectedRecord();
    const reused=await (await request('quality/'+second+'/escalate',escalation,'manager')).json();
    assert.equal(reused.reused,true);assert.equal(reused.incident,linked.incident);
    assert.equal((await (await request('audit-ledger/verify')).json()).valid,true);
    const queue=await (await request('models?open=1&order=due&limit=25')).json();
    assert.deepEqual(queue.records.map(item=>item.id),[record.id],'open queue excludes terminal rejected records');
    const proof=await request('audit-ledger/export');assert.equal(proof.status,200);
    const bundle=await proof.json();
    assert.equal(bundle.schema,'dxtrace.audit.v1');
    assert.equal(bundle.events.filter(event=>JSON.parse(event.payload).action==='quality.escalate').length,2);
    assert.equal((await request('audit-ledger/export',undefined,'staff')).status,403);

    // The second frontend can crash without taking the warehouse or Core down.
    await stop(qualityProcess);
    qualityProcess=null;
    assert.equal((await fetch(web+'/apps/quality/')).status,503);
    assert.equal((await request('models/quality/records')).status,200,
      'Core remains operational when the app frontend is unavailable');
    assert.equal((await request('state')).status,200,
      'warehouse remains available when the second frontend is stopped');
  } finally {
    await stop(appProcess);await stop(coreProcess);await stop(qualityProcess);
    await rm(dir,{recursive:true,force:true});
  }
});
