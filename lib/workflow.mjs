/*
 * DX-TRACE | Approval states and role-based transitions
 *
 * @Project DX-TRACE
 * @Maintainer DX-TRACE contributors
 * @File lib/workflow.mjs
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
export const defaultWorkflow={id:'approval',name:'Phê duyệt đề xuất',states:['draft','submitted','approved','rejected'],initial:'draft',transitions:[{from:'draft',to:'submitted',roles:['owner','manager','warehouse']},{from:'submitted',to:'approved',roles:['owner','manager']},{from:'submitted',to:'rejected',roles:['owner','manager']}]};
export function advanceWorkflow(def,run,target,role){const edge=def.transitions.find(t=>t.from===run.status&&t.to===target);if(!edge)throw new Error('Chuyển trạng thái không hợp lệ');if(!edge.roles.includes(role))throw new Error('Vai trò không được thực hiện bước này');return {...run,status:target}}
