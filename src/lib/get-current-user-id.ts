import { cookies } from 'next/headers';
import { container } from '@/lib/inversify.config';
import { SYMBOL } from '@/types/symbol';
import type { IAuthApplicationService } from '@/applications/auth/auth-application-service';

export async function getCurrentUserIdOrThrow(): Promise<string> {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token');

    if (!sessionToken) {
        throw new Error('Unauthorized');
    }

    const authService = container.get<IAuthApplicationService>(SYMBOL.IAuthApplicationService);
    const user = await authService.getCurrentUser(sessionToken.value);

    if (!user) {
        throw new Error('Unauthorized');
    }

    return user.id;
}

export async function getCurrentUserId(): Promise<string | null> {
    try {
        return await getCurrentUserIdOrThrow();
    } catch {
        return null;
    }
}


