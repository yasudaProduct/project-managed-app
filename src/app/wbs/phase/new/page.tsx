import { PhaseForm } from "../phase.form";

export default function NewPhasePage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">新規工程作成 (テンプレート)</h1>
      <PhaseForm />
    </div>
  );
}
