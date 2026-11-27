/* SPDX-FileCopyrightText: 2026 DX-TRACE contributors
 * SPDX-License-Identifier: MIT
 * DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
 */
/*
 * DX-TRACE | Accessible warehouse dialogs
 *
 * @Project DX-TRACE
 * @Maintainer DX-TRACE contributors
 * @File app/workspace-dialog.tsx
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
import {useLayoutEffect, useRef, type ReactNode} from 'react';

type Props = {labelledBy:string, children:ReactNode, busy?:boolean, onDismiss:()=>void};

export default function WorkspaceDialog({labelledBy,children,busy=false,onDismiss}:Props) {
  const ref=useRef<HTMLDialogElement>(null);
  useLayoutEffect(()=>{
    const dialog=ref.current;
    const trigger=document.activeElement;
    dialog?.showModal();
    return ()=>{
      dialog?.close();
      if(trigger instanceof HTMLElement && trigger.isConnected)trigger.focus({preventScroll:true});
    };
  },[]);
  return <dialog ref={ref} className="modal warehouse-dialog" aria-labelledby={labelledBy}
    onCancel={event=>{event.preventDefault();if(!busy)onDismiss()}}
    onClick={event=>{
      if(busy||event.target!==event.currentTarget)return;
      const rect=event.currentTarget.getBoundingClientRect();
      if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)onDismiss();
    }}>
    {children}
  </dialog>;
}
