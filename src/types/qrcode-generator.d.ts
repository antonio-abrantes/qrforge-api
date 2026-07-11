declare module 'qrcode-generator' {
  interface QRCode {
    addData(data: string, mode?: string): void
    make(): void
    getModuleCount(): number
    isDark(row: number, col: number): boolean
  }

  interface QRCodeStatic {
    (typeNumber: number, errorCorrectionLevel: string): QRCode
    stringToBytes: (s: string) => number[]
    stringToBytesFuncs: Record<string, (s: string) => number[]>
  }

  const qrcode: QRCodeStatic
  export default qrcode
}
