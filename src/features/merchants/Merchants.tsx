import { EmptyState } from "../../components/common/EmptyState";
import { PageContainer } from "../../components/common/PageContainer";
import { PageHeader } from "../../components/common/PageHeader";
import { Section } from "../../components/common/Section";
import { Surface } from "../../components/common/Surface";

export function Merchants() {
    return (
        <PageContainer>
            <PageHeader
                title="Merchants"
                description="Manage merchant mappings and automatic categorization."
            />

            <Section
                title="Known Merchants"
                description="Your learned merchant database."
            >
                <Surface className="p-6">
                    <EmptyState
                        title="No merchants"
                        description="Merchants will be learned automatically from confirmed transactions."
                    />
                </Surface>
            </Section>
        </PageContainer>
    );
}