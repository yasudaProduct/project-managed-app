import RegisterForm from "@/components/auth/register-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        プロジェクト管理システム
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        新規アカウントを作成してください
                    </p>
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle>新規登録</CardTitle>
                        <CardDescription>
                            アカウント情報を入力してください。パスワードは任意です。
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RegisterForm />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}