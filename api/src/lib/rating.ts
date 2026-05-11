/**
 * Customer behavior rating.
 * Inputs:
 *  - totalInstallments: number of scheduled installments to date (excluding future ones)
 *  - latePaid:        installments paid after due date
 *  - currentlyLate:   installments still unpaid past due date
 *  - paidOnTime:      installments paid on or before due date
 */
export type RatingInput = {
  totalInstallments: number;
  paidOnTime: number;
  latePaid: number;
  currentlyLate: number;
};

export type RatingLabel = 'COMMITTED' | 'MEDIUM' | 'RISK' | 'NEW';
export type Rating = {
  label: RatingLabel;
  score: number;          // 0..100
  commitmentRate: number; // 0..1
  lateCount: number;
  suggestion: string;
};

export function computeRating(i: RatingInput): Rating {
  const total = i.totalInstallments;
  if (total === 0) {
    return {
      label: 'NEW',
      score: 100,
      commitmentRate: 1,
      lateCount: 0,
      suggestion: 'زبون جديد — لا توجد بيانات كافية بعد.',
    };
  }
  const lateCount = i.latePaid + i.currentlyLate;
  const commitmentRate = i.paidOnTime / total;

  // Score: 100% start, lose 8 per late, lose 15 per still-late, floor 0
  let score = 100 - i.latePaid * 8 - i.currentlyLate * 15;
  if (commitmentRate < 0.5) score -= 20;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let label: RatingLabel;
  let suggestion: string;
  if (score >= 80 && i.currentlyLate === 0) {
    label = 'COMMITTED';
    suggestion = 'زبون ملتزم — يمكن منحه ديون جديدة بثقة.';
  } else if (score >= 55) {
    label = 'MEDIUM';
    suggestion = 'خطر متوسط — راقب مواعيد الدفع قبل منح دين جديد.';
  } else {
    label = 'RISK';
    suggestion = 'لا تعطه دين جديد قبل تسديد المتأخرات.';
  }
  return { label, score, commitmentRate, lateCount, suggestion };
}
