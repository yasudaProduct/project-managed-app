import ProjectsPage from "./projects/page";

export default async function Home() {
  return (
    <div className="flex min-h-screen">
      <main className="flex-1 p-2">
        <h1 className="text-3xl ml-12 font-bold mb-6"></h1>
        <div className="">
          <ProjectsPage />
        </div>
      </main>
    </div>
  );
}
