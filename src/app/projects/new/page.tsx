import { NewProjectForm } from "./new-project-form";

export default function NewProjectPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">新規プロジェクト作成</h1>
      <NewProjectForm />
    </div>
  );
}
