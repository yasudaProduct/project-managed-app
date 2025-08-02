import LoginForm from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        プロジェクト管理システム
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        アカウントにログインしてください
                    </p>
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle>ログイン</CardTitle>
                        <CardDescription>
                            メールアドレスを入力してログインしてください。パスワードが設定されている場合は入力が必要です。
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <LoginForm />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}