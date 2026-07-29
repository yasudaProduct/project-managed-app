import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EvmMetricsCard } from "@/components/evm/evm-metrics-card";
import type { EvmMetricsData } from "@/applications/evm/evm-dashboard-dto";

/**
 * EVMメトリクスカードの表示検証。
 *
 * 調査レポート（docs/reports/evm-operational-reliability-investigation.md）への対応:
 * - UI-2: AC=0 かつ進捗ありのとき「実績未取込」警告を出す（カードEV=0の誤解防止）
 * - UI-5: SPI/CPIバーの色をプロジェクト設定しきい値に連動させる
 * - UI-9: 金額の丸めを内訳表・CSVと統一する
 * - UI-12: EAC/ETCの空ツールチップに説明を入れる
 */

const makeMetrics = (overrides: Partial<EvmMetricsData> = {}): EvmMetricsData => ({
  date: "2026-07-15T00:00:00.000Z",
  pv_base: 100,
  pv: 100,
  ev: 80,
  ac: 90,
  bac: 200,
  sv: -20,
  cv: -10,
  spi: 0.8,
  cpi: 0.888,
  eac: 225,
  etc: 135,
  vac: -25,
  completionRate: 40,
  healthStatus: "warning",
  calculationMode: "hours",
  progressMethod: "SELF_REPORTED",
  forecastMethod: "CPI_ONLY",
  healthyThreshold: 0.9,
  warningThreshold: 0.8,
  formattedPv: "100.0h",
  formattedEv: "80.0h",
  formattedAc: "90.0h",
  formattedBac: "200.0h",
  isPredicted: false,
  ...overrides,
});

describe("EvmMetricsCard", () => {
  describe("UI-2: 実績未取込警告", () => {
    it("AC=0 かつ 進捗ありのとき、geppo未取込によるEV/SPI過小の警告を表示する", () => {
      render(
        <EvmMetricsCard
          metrics={makeMetrics({ ac: 0, ev: 0, spi: 0, cpi: null })}
          actualsNotImported
        />
      );

      expect(screen.getByText(/実績未取込/)).toBeInTheDocument();
      expect(screen.getByText(/EV\/SPIが過小/)).toBeInTheDocument();
    });

    it("警告フラグが立っていなければ表示しない", () => {
      render(<EvmMetricsCard metrics={makeMetrics()} />);

      expect(screen.queryByText(/実績未取込/)).not.toBeInTheDocument();
    });
  });

  describe("UI-5: SPI/CPIバーの色がしきい値に連動する", () => {
    // 外側トラック(bg-gray-200)と内側バーは同じ h-2/rounded-full を持つため、
    // width を style で持つ内側バーだけを対象にする（0番目=SPI, 1番目=CPI）
    const barClass = (container: HTMLElement, index: number): string =>
      container.querySelectorAll("div.h-2.rounded-full[style]")[index]
        ?.className ?? "";

    it("既定しきい値(90/80%)ではSPI=0.85が黄色になる", () => {
      const { container } = render(
        <EvmMetricsCard metrics={makeMetrics({ spi: 0.85, cpi: 0.85 })} />
      );
      // 0番目はトラック（bg-gray-200）を含まない内側バーのみを対象にする
      expect(barClass(container, 0)).toContain("bg-yellow-500");
    });

    it("しきい値を95/90%に上げるとSPI=0.92が緑から黄へ変わる", () => {
      const { container: def } = render(
        <EvmMetricsCard metrics={makeMetrics({ spi: 0.92, cpi: 0.92 })} />
      );
      expect(barClass(def, 0)).toContain("bg-green-500");

      const { container: strict } = render(
        <EvmMetricsCard
          metrics={makeMetrics({
            spi: 0.92,
            cpi: 0.92,
            healthyThreshold: 0.95,
            warningThreshold: 0.9,
          })}
        />
      );
      expect(barClass(strict, 0)).toContain("bg-yellow-500");
    });
  });

  describe("UI-9: 金額の丸め", () => {
    it("金額モードのSV/CV/EAC/ETC/VACは円未満を四捨五入して表示する", () => {
      render(
        <EvmMetricsCard
          metrics={makeMetrics({
            calculationMode: "cost",
            sv: -200000.4,
            cv: -100000.6,
            eac: 1234.5678,
            etc: 555.5,
            vac: -25.4,
            formattedPv: "¥1,000,000",
            formattedEv: "¥800,000",
            formattedAc: "¥900,000",
            formattedBac: "¥2,000,000",
          })}
        />
      );

      expect(screen.getByText("¥-200,000")).toBeInTheDocument();
      expect(screen.getByText("¥-100,001")).toBeInTheDocument();
      expect(screen.getByText("¥1,235")).toBeInTheDocument();
      expect(screen.getByText("¥556")).toBeInTheDocument();
      expect(screen.getByText("¥-25")).toBeInTheDocument();
    });
  });

  describe("UI-12: EAC/ETCの説明ツールチップ", () => {
    it("EAC・ETCの説明文が（非表示状態でも）DOMに存在する", () => {
      render(<EvmMetricsCard metrics={makeMetrics()} />);

      // Radix Tooltip は hover 前は内容を描画しないため、
      // aria-label に説明を持たせて常に検証可能にしている
      expect(
        screen.getByLabelText(/EAC.*完了時点の総コスト予測/)
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/ETC.*残作業に必要なコスト/)).toBeInTheDocument();
    });
  });
});
