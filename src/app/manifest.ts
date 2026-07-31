import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest { return { name:"Indotek Sukses Inventory & POS", short_name:"Indotek POS", description:"Sistem kasir dan inventori multi-toko.", start_url:"/dashboard", display:"standalone", background_color:"#f4f7fb", theme_color:"#0b4cc2", icons:[] }; }
