import { EmptyState } from "../../components/common/EmptyState";
import { PageContainer } from "../../components/common/PageContainer";
import { PageHeader } from "../../components/common/PageHeader";
import { Section } from "../../components/common/Section";
import { Surface } from "../../components/common/Surface";

export function Categories() {
    return (
        <PageContainer>
            <PageHeader
                title="Categories"
                description="Organize your spending into meaningful groups."
            />

            <Section
                title="Available Categories"
                description="Default and custom categories."
            >
                <Surface className="p-6">
                    <EmptyState
                        title="No categories"
                        description="Categories will appear here."
                    />
                </Surface>
            </Section>
        </PageContainer>
    );
}