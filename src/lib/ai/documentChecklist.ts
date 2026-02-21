import type { TaxFormData } from '@/types/TaxForm';

export interface DocumentChecklistItem {
  id: string;
  label: string;
  section: string;
  required: boolean;
  present: boolean;
}

const SECTION_LABELS: Record<string, { label: string; required: boolean }> = {
  employment: {
    label: 'Potvrdenie o zdaniteľných príjmoch',
    required: true,
  },
  dividends: {
    label: 'Výkaz dividend (CSV/PDF) alebo 1042-S',
    required: true,
  },
  mutualFunds: {
    label: 'Výpis z podielových fondov',
    required: true,
  },
  stockSales: {
    label: 'Výpis obchodov s akciami',
    required: true,
  },
  mortgage: {
    label: 'Potvrdenie o zaplatených úrokoch',
    required: true,
  },
  childBonus: {
    label: 'Rodné listy detí',
    required: false,
  },
};

function matchesSection(
  documentType: string,
  section: string
): boolean {
  if (section === 'employment') return documentType === 'employment';
  if (section === 'dividends')
    return documentType === 'dividends' || documentType === '1042s';
  if (section === 'mutualFunds' || section === 'stockSales')
    return documentType === 'broker_report';
  if (section === 'mortgage') return documentType === 'mortgage';
  if (section === 'childBonus') return documentType === 'childBonus';
  return false;
}

export function getDocumentChecklist(
  form: TaxFormData
): DocumentChecklistItem[] {
  const items: DocumentChecklistItem[] = [];
  const inbox = form.aiCopilot?.documentInbox ?? [];

  if (form.employment.enabled) {
    items.push({
      id: 'employment',
      label: SECTION_LABELS.employment.label,
      section: 'employment',
      required: SECTION_LABELS.employment.required,
      present: inbox.some((doc) => matchesSection(doc.documentType, 'employment')),
    });
  }

  if (form.dividends.enabled) {
    items.push({
      id: 'dividends',
      label: SECTION_LABELS.dividends.label,
      section: 'dividends',
      required: SECTION_LABELS.dividends.required,
      present: inbox.some((doc) => matchesSection(doc.documentType, 'dividends')),
    });
  }

  if (form.mutualFunds.enabled) {
    items.push({
      id: 'mutualFunds',
      label: SECTION_LABELS.mutualFunds.label,
      section: 'mutualFunds',
      required: SECTION_LABELS.mutualFunds.required,
      present: inbox.some((doc) =>
        matchesSection(doc.documentType, 'mutualFunds')
      ),
    });
  }

  if (form.stockSales.enabled) {
    items.push({
      id: 'stockSales',
      label: SECTION_LABELS.stockSales.label,
      section: 'stockSales',
      required: SECTION_LABELS.stockSales.required,
      present: inbox.some((doc) =>
        matchesSection(doc.documentType, 'stockSales')
      ),
    });
  }

  if (form.mortgage.enabled) {
    items.push({
      id: 'mortgage',
      label: SECTION_LABELS.mortgage.label,
      section: 'mortgage',
      required: SECTION_LABELS.mortgage.required,
      present: false,
    });
  }

  if (form.childBonus.enabled) {
    items.push({
      id: 'childBonus',
      label: SECTION_LABELS.childBonus.label,
      section: 'childBonus',
      required: SECTION_LABELS.childBonus.required,
      present: false,
    });
  }

  return items;
}
