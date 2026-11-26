/* DX-TRACE | Observed cold-chain status, including synthetic-source labels.
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 DX-TRACE contributors. See LICENSE. */
import React from 'react';
import {AlertTriangle,FlaskConical,ShieldAlert} from 'lucide-react';

export default function ColdChainStatus({reading,lot,incident,synthetic,onIncident,onEvidence}:any){
 if(!reading||!lot)return null;
 const outside=reading.temperature<lot.min_temp||reading.temperature>lot.max_temp;
 const held=['quarantine','recall'].includes(lot.status);
 return <div className="cold-chain-status">
  {(synthetic||incident?.synthetic)&&<span className="cold-chain-fixture"><FlaskConical size={13} aria-hidden="true"/>Dữ liệu cảm biến mô phỏng</span>}
  {outside&&<p className="cold-chain-excursion"><AlertTriangle size={15} aria-hidden="true"/><span>Phát hiện nhiệt độ vượt ngưỡng{!held&&' · chờ đủ chuỗi số đo để kích hoạt cách ly'}</span></p>}
  {held&&<p className="cold-chain-hold"><ShieldAlert size={15} aria-hidden="true"/>{lot.status==='recall'?'Lô đang thu hồi · đã chặn giao':'Lô đã cách ly · đã chặn giao'}</p>}
  {incident&&<div className="cold-chain-review"><button className="text-link" onClick={onIncident}>Mở sự cố {incident.id}</button>{incident.review&&<small>{incident.review.outcome?'Flowable đã có kết quả: '+incident.review.outcome:incident.review.instance?'Flowable đang thẩm định':'Đã giữ lô; đang chờ đồng bộ Flowable'}</small>}{onEvidence&&<button className="text-link" onClick={onEvidence}>Đối chiếu hồ sơ Evidence</button>}</div>}
 </div>;
}
