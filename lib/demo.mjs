/*
 * DX-TRACE | Training workspace seed data and upgrades
 *
 * @Project DX-TRACE
 * @Maintainer DX-TRACE contributors
 * @File lib/demo.mjs
 * SPDX-License-Identifier: MIT
 *
 * MIT License
 *
 * Copyright (c) 2026 DX-TRACE contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
export function seedDemo(source,now=new Date().toISOString()){
 if(source.lots.length||source.partners.length||source.events.length)throw new Error('Chỉ nạp bộ mẫu vào không gian trống');
 const s=structuredClone(source);s.demo=true;s.name='An Nhiên Foods · Dữ liệu mẫu';
 const date=n=>new Date(Date.parse(now)+n*86400000).toISOString().slice(0,10);
 s.partners=[{id:'DEMO-SUP-1',name:'Trang trại Mộc An (mẫu)',kind:'supplier',address:'Mộc Châu',contact:'Dữ liệu giả lập'},{id:'DEMO-SUP-2',name:'Nông sản Đà Lạt (mẫu)',kind:'supplier',address:'Đà Lạt',contact:'Dữ liệu giả lập'},{id:'DEMO-DST-1',name:'Cửa hàng Cầu Giấy (mẫu)',kind:'destination',address:'Hà Nội'},{id:'DEMO-DST-2',name:'Cửa hàng Hà Đông (mẫu)',kind:'destination',address:'Hà Nội'}].map(x=>({...x,created:now}));
 s.lots=[['DEMO-LOT-1','SUA-001','Sữa tươi thanh trùng',240,5,'DEMO-SUP-1','active'],['DEMO-LOT-2','RAU-002','Rau xà lách',120,2,'DEMO-SUP-2','active'],['DEMO-LOT-3','SUA-003','Sữa chua nguyên chất',180,12,'DEMO-SUP-1','quarantine'],['DEMO-LOT-4','RAU-004','Cà chua hữu cơ',90,-1,'DEMO-SUP-2','active']].map(([id,code,product,quantity,expiry,supplier,status])=>({id,code,product,quantity,expiry:date(Number(expiry)),supplier,status,unit:'hộp',location:'Kho lạnh A',min_temp:2,max_temp:8,barcode:'',notes:'Hồ sơ mẫu giả lập; không phải sản phẩm hay giao dịch thật.',created:now}));
 s.shipments=[{id:'DEMO-SH-1',lot:'DEMO-LOT-1',destination:'DEMO-DST-1',quantity:40,status:'delivered'},{id:'DEMO-SH-2',lot:'DEMO-LOT-1',destination:'DEMO-DST-2',quantity:30,status:'reserved'},{id:'DEMO-SH-3',lot:'DEMO-LOT-3',destination:'DEMO-DST-1',quantity:50,status:'delivered'},{id:'DEMO-SH-4',lot:'DEMO-LOT-3',destination:'DEMO-DST-2',quantity:20,status:'reserved'}].map(x=>({...x,created:now,updated:now}));
 s.incidents=[{id:'DEMO-INC-1',lot:'DEMO-LOT-3',reason:'Tình huống mẫu: phát hiện bảo quản vượt ngưỡng; cần đối soát các điểm nhận.',severity:'high',status:'pending',created:now,updated:now}];
 s.documents=[{id:'DEMO-SOP-1',title:'SOP mẫu: xử lý thu hồi',content:'1. Ghi nhận sự cố và cách ly lô.\n2. Quản lý kiểm tra bằng chứng, phê duyệt thu hồi.\n3. Hủy phiếu chưa giao; liên hệ điểm nhận và xác nhận hàng đã nhận trả.\n4. Đối soát hết phiếu trước khi đóng sự cố. Lô vẫn bị chặn xuất.\nĐây là quy trình minh họa, cần tổ chức phê duyệt trước khi áp dụng.',created:now},{id:'DEMO-SOP-2',title:'SOP mẫu: nhập kho và hạn dùng',content:'Kiểm tra nhà cung cấp, mã lô, số lượng, hạn dùng và ngưỡng bảo quản. Ưu tiên xuất lô gần hết hạn. Không xuất lô đang cách ly hoặc hết hạn.',created:now}];
 s.events=[{id:'DEMO-EVENT-1',actor:'Hệ thống dữ liệu mẫu',action:'demo.seed',entity:'DEMO',detail:'Khởi tạo tình huống giả lập để trải nghiệm; không phải lịch sử vận hành thật.',created:now}];return expandTraining(s,now);
}

// Also upgrades existing training workspaces without replacing operator edits.
export function expandTraining(s, now) {
 if (!s.demo || s.trainingEdition >= 2) return s;
 const day = delta => new Date(Date.parse(now) + delta * 86400000).toISOString().slice(0,10);
 const time = minutes => new Date(Date.parse(now) - minutes * 60000).toISOString();
 const add = (table,row) => {
   if (!s[table].some(x => x.id === row.id)) s[table].push(row);
 };
 const destinations = ['Long Biên','Tây Hồ','Thanh Xuân','Nam Từ Liêm'];
 destinations.forEach((name,i) => add('partners',{id:'DX-DST-'+i,name:'Điểm nhận '+name,kind:'destination',address:name+', Hà Nội',created:time(2880)}));
 const foods = [
   ['SUA-005','Sữa chua dâu','hộp',320,12],['SUA-006','Sữa tươi ít đường','chai',260,7],
   ['RAU-007','Cải bó xôi','túi',145,2],['RAU-008','Bông cải xanh','túi',160,5],
   ['SUA-009','Phô mai tươi','hộp',220,18],['RAU-010','Dưa leo','túi',180,4],
   ['RAU-011','Ớt chuông','túi',150,6],['SUA-012','Sữa chua uống','chai',300,9],
   ['RAU-013','Xà lách tím','túi',130,1],['SUA-014','Váng sữa','hộp',240,15],
   ['RAU-015','Cà rốt','túi',190,8],['SUA-016','Sữa tươi nguyên kem','chai',280,6]
 ];
 foods.forEach(([code,product,unit,quantity,days],i) => {
   const id='DX-LOT-'+code, dairy=code.startsWith('SUA');
   add('lots',{id,code,product,unit,quantity,expiry:day(days),supplier:'DEMO-SUP-'+(dairy?1:2),status:i===0?'recall':'active',location:dairy?'Kho lạnh A':'Kho rau B',min_temp:2,max_temp:8,created:time(2880),notes:'Dữ liệu diễn tập'});
   for (let j=0;j<3;j++) {
     const shipment={id:'DX-SH-'+i+'-'+j,lot:id,destination:'DX-DST-'+((i+j)%4),quantity:[30,20,12][j]+(i%4)*2,status:j===2?'reserved':'delivered',created:time(1450),updated:time(60+j)};
     if(i===0 && j===0) shipment.returnedQuantity=17;
     add('shipments',shipment);
   }
   if(i<4){
     const device='DX-SENSOR-'+i;
     add('devices',{id:device,name:'Đầu dò '+code,lot:id,active:true,created:time(1440)});
     [4.2,4.5,5.1,6.0,7.3,8.4,9.6,10.8].forEach((value,j)=>{
       const recorded=time((7-j)*5+90);
       add('readings',{id:device+':'+j,device,lot:id,temperature:i===0?value:Math.round((4+i*.4+j*.1)*10)/10,recorded,received:recorded});
     });
   }
 });
 add('incidents',{id:'DX-INC-005',lot:'DX-LOT-SUA-005',reason:'Đầu dò ghi nhận nhiệt độ vượt 8 °C. Đã duyệt thu hồi tại hai điểm nhận.',severity:'high',status:'approved',created:time(88),updated:time(60)});
 for(const [i,detail] of ['SUA-005 vượt ngưỡng bảo quản','Quản lý phê duyệt thu hồi SUA-005','Long Biên trả 17 hộp sữa chua dâu'].entries())
   add('events',{id:'DX-LOG-'+i,actor:'Tổ vận hành mẫu',entity:'DX-LOT-SUA-005',action:'demo.history',detail,created:time(88-i*14)});
 s.events.sort((a,b)=>b.created.localeCompare(a.created));
 s.readings.sort((a,b)=>b.recorded.localeCompare(a.recorded));
 s.trainingEdition=2;
 return s;
}
