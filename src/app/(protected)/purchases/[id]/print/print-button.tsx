"use client";
import { Printer } from "lucide-react";
export function PurchasePrintButton(){return <button className="button primary no-print" onClick={()=>window.print()}><Printer size={16}/> Cetak / Simpan PDF</button>}
