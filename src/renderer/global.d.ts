import type { MoneyPigApi } from "../shared/types";

declare global {
  interface Window {
    moneyPig: MoneyPigApi;
  }
}

export {};
