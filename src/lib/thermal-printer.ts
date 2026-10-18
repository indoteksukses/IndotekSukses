import { generateSaleReceiptEscPos, generateTestReceiptEscPos } from "./escpos";
import type { SaleDetail, SystemSettings } from "./types";

export type PrinterConnectionStatus = "disconnected" | "connecting" | "connected" | "error";
export type PrinterConnectionType = "bluetooth" | "serial" | "none";
export type ThermalPaperWidth = 58 | 80;

export interface ThermalPrinterState {
  status: PrinterConnectionStatus;
  type: PrinterConnectionType;
  deviceName: string | null;
  paperWidth: ThermalPaperWidth;
  autoPrintOnCheckout: boolean;
  errorMessage: string | null;
}

// Common Bluetooth GATT Services for ESC/POS Thermal Printers
const COMMON_BT_SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb", // Standard ESC/POS
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC Transparent UART
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // Feasycom UART
  "0000ff00-0000-1000-8000-00805f9b34fb", // Common POS Vendor
  "0000e0ff-0000-1000-8000-00805f9b34fb", // BlueTooth Print
  "0000ae00-0000-1000-8000-00805f9b34fb", // Raw SPP
  "0000af00-0000-1000-8000-00805f9b34fb",
];

class ThermalPrinterManager {
  private state: ThermalPrinterState = {
    status: "disconnected",
    type: "none",
    deviceName: null,
    paperWidth: 58,
    autoPrintOnCheckout: false,
    errorMessage: null,
  };

  private listeners = new Set<(state: ThermalPrinterState) => void>();

  // Bluetooth references
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private btDevice: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private btCharacteristic: any = null;

  // Serial references
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private serialPort: any = null;

  constructor() {
    if (typeof window !== "undefined") {
      const savedWidth = localStorage.getItem("indotek_thermal_paper_width");
      if (savedWidth === "80" || savedWidth === "58") {
        this.state.paperWidth = Number(savedWidth) as ThermalPaperWidth;
      }
      this.state.autoPrintOnCheckout = localStorage.getItem("indotek_auto_print_thermal") === "true";
    }
  }

  public getState(): ThermalPrinterState {
    return { ...this.state };
  }

  public setAutoPrintOnCheckout(enabled: boolean) {
    this.updateState({ autoPrintOnCheckout: enabled });
    if (typeof window !== "undefined") {
      localStorage.setItem("indotek_auto_print_thermal", enabled ? "true" : "false");
    }
  }

  public subscribe(listener: (state: ThermalPrinterState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateState(partial: Partial<ThermalPrinterState>) {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      listener(this.getState());
    }
  }

  public setPaperWidth(width: ThermalPaperWidth) {
    this.updateState({ paperWidth: width });
    if (typeof window !== "undefined") {
      localStorage.setItem("indotek_thermal_paper_width", String(width));
    }
  }

  public isBluetoothSupported(): boolean {
    return typeof navigator !== "undefined" && "bluetooth" in navigator;
  }

  public isSerialSupported(): boolean {
    return typeof navigator !== "undefined" && "serial" in navigator;
  }

  /**
   * Connect to Thermal Printer via Bluetooth
   */
  public async connectBluetooth(): Promise<boolean> {
    if (!this.isBluetoothSupported()) {
      this.updateState({
        status: "error",
        errorMessage: "Browser Anda belum mendukung Web Bluetooth. Gunakan Chrome, Edge, atau browser berbasis Chromium.",
      });
      return false;
    }

    try {
      this.updateState({ status: "connecting", errorMessage: null });

      // Request device with all common thermal printer service filters
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav = navigator as any;
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: COMMON_BT_SERVICES,
      });

      if (!device) {
        this.updateState({ status: "disconnected" });
        return false;
      }

      device.addEventListener("gattserverdisconnected", () => {
        this.btDevice = null;
        this.btCharacteristic = null;
        this.updateState({
          status: "disconnected",
          type: "none",
          deviceName: null,
          errorMessage: "Koneksi printer terputus.",
        });
      });

      const server = await device.gatt.connect();

      // Find writable characteristic across available services
      let writeChar = null;
      for (const serviceUuid of COMMON_BT_SERVICES) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              writeChar = char;
              break;
            }
          }
          if (writeChar) break;
        } catch {
          // Ignore service if not found on this device
          continue;
        }
      }

      // If not found in common UUIDs, discover all services
      if (!writeChar) {
        try {
          const services = await server.getPrimaryServices();
          for (const service of services) {
            const characteristics = await service.getCharacteristics();
            for (const char of characteristics) {
              if (char.properties.write || char.properties.writeWithoutResponse) {
                writeChar = char;
                break;
              }
            }
            if (writeChar) break;
          }
        } catch (e) {
          console.warn("Failed searching all services:", e);
        }
      }

      if (!writeChar) {
        throw new Error("Karakteristik cetak ESC/POS tidak ditemukan pada printer Bluetooth ini.");
      }

      this.btDevice = device;
      this.btCharacteristic = writeChar;

      this.updateState({
        status: "connected",
        type: "bluetooth",
        deviceName: device.name || "Printer Bluetooth Thermal",
        errorMessage: null,
      });

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menghubungkan printer Bluetooth";
      // User cancelled dialog is not an error
      if (msg.includes("User cancelled") || msg.includes("cancelled")) {
        this.updateState({ status: "disconnected", errorMessage: null });
        return false;
      }
      this.updateState({
        status: "error",
        errorMessage: msg,
      });
      return false;
    }
  }

  /**
   * Connect to Thermal Printer via USB / Serial
   */
  public async connectSerial(baudRate = 9600): Promise<boolean> {
    if (!this.isSerialSupported()) {
      this.updateState({
        status: "error",
        errorMessage: "Browser Anda belum mendukung Web Serial (USB/COM). Gunakan Chrome atau Edge.",
      });
      return false;
    }

    try {
      this.updateState({ status: "connecting", errorMessage: null });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav = navigator as any;
      const port = await nav.serial.requestPort();
      await port.open({ baudRate });

      this.serialPort = port;
      this.updateState({
        status: "connected",
        type: "serial",
        deviceName: "Printer USB / Serial",
        errorMessage: null,
      });

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menghubungkan printer Serial / USB";
      if (msg.includes("No port selected") || msg.includes("cancelled")) {
        this.updateState({ status: "disconnected", errorMessage: null });
        return false;
      }
      this.updateState({
        status: "error",
        errorMessage: msg,
      });
      return false;
    }
  }

  /**
   * Disconnect any active printer
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.btDevice && this.btDevice.gatt.connected) {
        this.btDevice.gatt.disconnect();
      }
      if (this.serialPort) {
        await this.serialPort.close();
      }
    } catch (e) {
      console.warn("Disconnect error:", e);
    } finally {
      this.btDevice = null;
      this.btCharacteristic = null;
      this.serialPort = null;
      this.updateState({
        status: "disconnected",
        type: "none",
        deviceName: null,
        errorMessage: null,
      });
    }
  }

  /**
   * Send raw ESC/POS bytes to connected printer
   */
  public async printRaw(data: Uint8Array): Promise<boolean> {
    if (this.state.status !== "connected") {
      throw new Error("Printer thermal belum terhubung. Sambungkan printer terlebih dahulu.");
    }

    // 1. Bluetooth print with chunking
    if (this.state.type === "bluetooth" && this.btCharacteristic) {
      const chunkSize = 100; // Safe chunk size for BLE MTU
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        if (this.btCharacteristic.writeValueWithoutResponse) {
          await this.btCharacteristic.writeValueWithoutResponse(chunk);
        } else {
          await this.btCharacteristic.writeValue(chunk);
        }
        // Small delay between chunks to prevent Bluetooth buffer overflow
        if (i + chunkSize < data.length) {
          await new Promise((r) => setTimeout(r, 20));
        }
      }
      return true;
    }

    // 2. Serial / USB print
    if (this.state.type === "serial" && this.serialPort) {
      const writer = this.serialPort.writable.getWriter();
      try {
        await writer.write(data);
      } finally {
        writer.releaseLock();
      }
      return true;
    }

    throw new Error("Tipe koneksi printer tidak aktif.");
  }

  /**
   * Print a Sale Invoice to the connected thermal printer
   */
  public async printInvoice(
    sale: SaleDetail,
    settings?: SystemSettings | null,
    widthOverride?: ThermalPaperWidth
  ): Promise<boolean> {
    const width = widthOverride || this.state.paperWidth;
    const bytes = generateSaleReceiptEscPos(sale, settings, width);
    return await this.printRaw(bytes);
  }

  /**
   * Print a Test Receipt to verify thermal printing
   */
  public async printTestReceipt(
    settings?: SystemSettings | null,
    widthOverride?: ThermalPaperWidth
  ): Promise<boolean> {
    const width = widthOverride || this.state.paperWidth;
    const bytes = generateTestReceiptEscPos(settings, width);
    return await this.printRaw(bytes);
  }
}

// Global Singleton Instance
export const thermalPrinter = new ThermalPrinterManager();
