import { BankParserConfig } from "../types";
import { hdfcConfig } from "./hdfc";
import { iciciConfig } from "./icici";
import { sbiConfig } from "./sbi";
import { kotakConfig } from "./kotak";
import { axisConfig } from "./axis";

const bankParserRegistry: Record<string, BankParserConfig> = {
  HDFC: hdfcConfig,
  ICICI: iciciConfig,
  SBI: sbiConfig,
  KOTAK: kotakConfig,
  AXIS: axisConfig,
};

export function getBankParser(bankName: string): BankParserConfig | null {
  const upper = bankName?.toUpperCase().trim() || "";
  return bankParserRegistry[upper] || null;
}

export function detectBankFromFilename(fileName: string): string {
  const normalizedName = fileName.toUpperCase();
  const supported = ["HDFC", "ICICI", "SBI", "KOTAK", "AXIS"];
  for (const bank of supported) {
    if (normalizedName.includes(bank)) {
      return bank;
    }
  }
  return "OTHER";
}

export { hdfcConfig, iciciConfig, sbiConfig, kotakConfig, axisConfig };
