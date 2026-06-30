import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { PageContainer } from "../../components/common/PageContainer";
import { PageHeader } from "../../components/common/PageHeader";

import { useAuth } from "../../hooks/useAuth";

export function Settings() {
    const user = useAuth((state) => state.user);
    const signOut = useAuth((state) => state.signOut);

    return (
        <PageContainer>
            <PageHeader
                title="Settings"
                description="Manage your account and preferences."
            />

            <Card className="space-y-6">
                <div>
                    <h3 className="font-semibold text-slate-900">
                        Account
                    </h3>

                    <p className="mt-2 text-slate-500">
                        {user?.email}
                    </p>
                </div>

                <Button
                    variant="danger"
                    onClick={signOut}
                >
                    Logout
                </Button>
            </Card>
        </PageContainer>
    );
}