'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { CreditCard, SavingsAccount, InterestRateType, LinkedAccountType } from '@/types';
import {
  calculateLiabilityAmortization,
  calculateAmortizationSchedule,
  AmortizationSummary,
} from '@/lib/finance/amortizationEngine';
import { resolveFirstInstallmentDueDate, clampMonthEndDay } from '@/lib/finance/dateResolver';

export interface UseInstallmentFormOptions {
  creditCards?: CreditCard[];
  savingsAccounts?: SavingsAccount[];
  initialValues?: {
    principal?: number | string;
    termMonths?: number | string;
    interestRateType?: InterestRateType;
    interestRate?: number | string;
    monthlyAmortization?: number | string;
    isAmortizationOverridden?: boolean;
    dueDay?: number | string;
    startDate?: string;
    firstPaymentDate?: string;
    firstBillingMonth?: string;
    linkedAccountType?: LinkedAccountType | '';
    creditCardId?: string;
    savingsId?: string;
    paidInstallmentNumbers?: number[];
  };
}

export function useInstallmentForm(options: UseInstallmentFormOptions = {}) {
  const { creditCards = [], savingsAccounts = [], initialValues } = options;

  // Stable references for options to prevent callback invalidation
  const initialValuesRef = useRef(initialValues);
  initialValuesRef.current = initialValues;

  const creditCardsRef = useRef(creditCards);
  creditCardsRef.current = creditCards;

  const savingsAccountsRef = useRef(savingsAccounts);
  savingsAccountsRef.current = savingsAccounts;

  const [principal, setPrincipal] = useState<string>(
    initialValues?.principal !== undefined && initialValues.principal !== null
      ? String(initialValues.principal)
      : ''
  );
  const [termMonths, setTermMonths] = useState<string>(
    initialValues?.termMonths !== undefined && initialValues.termMonths !== null
      ? String(initialValues.termMonths)
      : '12'
  );
  const [interestRateType, setInterestRateType] = useState<InterestRateType>(
    initialValues?.interestRateType || 'monthly_addon'
  );
  const [interestRate, setInterestRate] = useState<string>(
    initialValues?.interestRate !== undefined && initialValues.interestRate !== null
      ? String(initialValues.interestRate)
      : '0'
  );
  const [monthlyAmortization, setMonthlyAmortizationState] = useState<string>(
    initialValues?.monthlyAmortization !== undefined && initialValues.monthlyAmortization !== null
      ? String(initialValues.monthlyAmortization)
      : ''
  );
  const [isAmortizationOverridden, setIsAmortizationOverridden] = useState<boolean>(
    Boolean(initialValues?.isAmortizationOverridden)
  );

  const [transactionDate, setTransactionDate] = useState<string>(
    initialValues?.startDate || new Date().toISOString().split('T')[0]
  );
  const [firstBillingMonth, setFirstBillingMonth] = useState<string>(
    initialValues?.firstBillingMonth || ''
  );
  const [firstPaymentDate, setFirstPaymentDate] = useState<string>(
    initialValues?.firstPaymentDate || ''
  );
  const [dueDay, setDueDayState] = useState<string>(
    initialValues?.dueDay !== undefined && initialValues.dueDay !== null
      ? String(initialValues.dueDay)
      : ''
  );

  const [linkedAccountType, setLinkedAccountType] = useState<LinkedAccountType | ''>(
    initialValues?.linkedAccountType || ''
  );
  const [creditCardId, setCreditCardId] = useState<string>(
    initialValues?.creditCardId || ''
  );
  const [savingsId, setSavingsId] = useState<string>(
    initialValues?.savingsId || ''
  );

  const [manualPaidNumbers, setManualPaidNumbers] = useState<number[] | null>(
    initialValues?.paidInstallmentNumbers || null
  );

  // Keep a ref of live values for calculation without invalidating callbacks
  const formValuesRef = useRef({
    principal,
    termMonths,
    interestRate,
    interestRateType,
    monthlyAmortization,
    isAmortizationOverridden,
  });
  formValuesRef.current = {
    principal,
    termMonths,
    interestRate,
    interestRateType,
    monthlyAmortization,
    isAmortizationOverridden,
  };

  // Selected entities
  const targetCard = useMemo(() => {
    return creditCards.find((c) => c.id === creditCardId) || null;
  }, [creditCards, creditCardId]);

  const selectedSavings = useMemo(() => {
    return savingsAccounts.find((s) => s.id === savingsId) || null;
  }, [savingsAccounts, savingsId]);

  // Derived effective due day
  const effectiveDueDay = useMemo(() => {
    if (linkedAccountType === 'credit_card' && targetCard?.due_day) {
      return targetCard.due_day;
    }
    const parsed = parseInt(dueDay, 10);
    return !isNaN(parsed) && parsed >= 1 && parsed <= 31 ? parsed : 15;
  }, [linkedAccountType, targetCard, dueDay]);

  // Recalculates amortization based on inputs with full stability
  const recalculateAmortization = useCallback(
    (
      pVal?: string,
      nVal?: string,
      rVal?: string,
      type?: InterestRateType
    ) => {
      const p = Number(pVal !== undefined ? pVal : formValuesRef.current.principal) || 0;
      const n = Number(nVal !== undefined ? nVal : formValuesRef.current.termMonths) || 0;
      const r = Number(rVal !== undefined ? rVal : formValuesRef.current.interestRate) || 0;
      const t = type !== undefined ? type : formValuesRef.current.interestRateType;

      if (p > 0 && n > 0) {
        const computed = calculateLiabilityAmortization({
          principal: p,
          termMonths: n,
          interestRate: r,
          rateType: t,
        });
        setMonthlyAmortizationState(computed > 0 ? String(computed) : '');
        setIsAmortizationOverridden(false);
      } else {
        setMonthlyAmortizationState('');
        setIsAmortizationOverridden(false);
      }
    },
    []
  );

  // Setters with auto-recalculation (stable function references)
  const handlePrincipalChange = useCallback((val: string) => {
    setPrincipal(val);
    if (!formValuesRef.current.isAmortizationOverridden) {
      const p = Number(val) || 0;
      const n = Number(formValuesRef.current.termMonths) || 0;
      const r = Number(formValuesRef.current.interestRate) || 0;
      if (p > 0 && n > 0) {
        const computed = calculateLiabilityAmortization({
          principal: p,
          termMonths: n,
          interestRate: r,
          rateType: formValuesRef.current.interestRateType,
        });
        setMonthlyAmortizationState(computed > 0 ? String(computed) : '');
      } else {
        setMonthlyAmortizationState('');
      }
    }
  }, []);

  const handleTermMonthsChange = useCallback((val: string) => {
    setTermMonths(val);
    if (!formValuesRef.current.isAmortizationOverridden) {
      const p = Number(formValuesRef.current.principal) || 0;
      const n = Number(val) || 0;
      const r = Number(formValuesRef.current.interestRate) || 0;
      if (p > 0 && n > 0) {
        const computed = calculateLiabilityAmortization({
          principal: p,
          termMonths: n,
          interestRate: r,
          rateType: formValuesRef.current.interestRateType,
        });
        setMonthlyAmortizationState(computed > 0 ? String(computed) : '');
      } else {
        setMonthlyAmortizationState('');
      }
    }
  }, []);

  const handleInterestRateChange = useCallback((val: string) => {
    setInterestRate(val);
    if (!formValuesRef.current.isAmortizationOverridden) {
      const p = Number(formValuesRef.current.principal) || 0;
      const n = Number(formValuesRef.current.termMonths) || 0;
      const r = Number(val) || 0;
      if (p > 0 && n > 0) {
        const computed = calculateLiabilityAmortization({
          principal: p,
          termMonths: n,
          interestRate: r,
          rateType: formValuesRef.current.interestRateType,
        });
        setMonthlyAmortizationState(computed > 0 ? String(computed) : '');
      } else {
        setMonthlyAmortizationState('');
      }
    }
  }, []);

  const handleInterestRateTypeChange = useCallback((newType: InterestRateType) => {
    setInterestRateType(newType);
    const p = Number(formValuesRef.current.principal) || 0;
    const n = Number(formValuesRef.current.termMonths) || 0;
    const r = Number(formValuesRef.current.interestRate) || 0;
    if (p > 0 && n > 0) {
      const computed = calculateLiabilityAmortization({
        principal: p,
        termMonths: n,
        interestRate: r,
        rateType: newType,
      });
      setMonthlyAmortizationState(computed > 0 ? String(computed) : '');
      setIsAmortizationOverridden(false);
    }
  }, []);

  const handleMonthlyAmortizationChange = useCallback((val: string) => {
    setMonthlyAmortizationState(val);
    setIsAmortizationOverridden(true);
  }, []);

  const resetAmortizationOverride = useCallback(() => {
    setIsAmortizationOverridden(false);
    const p = Number(formValuesRef.current.principal) || 0;
    const n = Number(formValuesRef.current.termMonths) || 0;
    const r = Number(formValuesRef.current.interestRate) || 0;
    if (p > 0 && n > 0) {
      const computed = calculateLiabilityAmortization({
        principal: p,
        termMonths: n,
        interestRate: r,
        rateType: formValuesRef.current.interestRateType,
      });
      setMonthlyAmortizationState(computed > 0 ? String(computed) : '');
    } else {
      setMonthlyAmortizationState('');
    }
  }, []);

  // Resolve effective first payment date
  const resolvedFirstPaymentDate = useMemo(() => {
    if (firstBillingMonth && firstBillingMonth.trim()) {
      const parts = firstBillingMonth.trim().split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      if (!isNaN(year) && !isNaN(month)) {
        const clamped = clampMonthEndDay(year, month - 1, effectiveDueDay);
        return `${year}-${String(month).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`;
      }
    }

    if (firstPaymentDate && firstPaymentDate.trim()) {
      const parts = firstPaymentDate.trim().split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      if (!isNaN(year) && !isNaN(month)) {
        const clamped = clampMonthEndDay(year, month - 1, effectiveDueDay);
        return `${year}-${String(month).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`;
      }
      return firstPaymentDate;
    }

    return resolveFirstInstallmentDueDate({
      transactionDate: transactionDate || new Date().toISOString().split('T')[0],
      dueDay: effectiveDueDay,
      statementDay: targetCard?.statement_day || null,
    });
  }, [firstBillingMonth, firstPaymentDate, transactionDate, effectiveDueDay, targetCard]);

  // Credit Card selection handler (stable)
  const handleCreditCardSelect = useCallback((cardId: string) => {
    setCreditCardId(cardId);
    const card = creditCardsRef.current.find((c) => c.id === cardId);
    if (card && card.due_day) {
      setDueDayState(String(card.due_day));
    }
  }, []);

  // Linked account type change handler (stable)
  const handleLinkedAccountTypeChange = useCallback((type: LinkedAccountType | '') => {
    setLinkedAccountType(type);
    if (type === 'credit_card') {
      setSavingsId('');
      if (creditCardsRef.current.length > 0) {
        handleCreditCardSelect(creditCardsRef.current[0].id);
      }
    } else if (type === 'savings') {
      setCreditCardId('');
      if (savingsAccountsRef.current.length > 0) {
        setSavingsId(savingsAccountsRef.current[0].id);
      }
    } else {
      setCreditCardId('');
      setSavingsId('');
    }
  }, [handleCreditCardSelect]);

  // Live schedule preview calculation
  const scheduleSummary: AmortizationSummary = useMemo(() => {
    const p = Number(principal) || 0;
    const n = Number(termMonths) || 0;
    const r = Number(interestRate) || 0;
    const pmt = Number(monthlyAmortization) || 0;

    if (p <= 0 || n <= 0) {
      return {
        monthlyPayment: 0,
        totalPayment: 0,
        totalInterest: 0,
        totalPrincipal: 0,
        schedule: [],
        paidCount: 0,
        unpaidCount: 0,
        paidPrincipal: 0,
        unpaidPrincipal: 0,
        remainingUnpaidBalance: 0,
      };
    }

    const annualRate = interestRateType === 'monthly_addon' ? r * 12 : r;

    return calculateAmortizationSchedule({
      principal: p,
      termMonths: n,
      rateType: interestRateType,
      interestRate: r,
      annualInterestRate: annualRate,
      monthlyPayment: pmt,
      isAmortizationOverridden,
      firstPaymentDate: resolvedFirstPaymentDate,
      monthlyDueDay: effectiveDueDay,
      paidInstallmentNumbers: manualPaidNumbers,
    });
  }, [
    principal,
    termMonths,
    interestRate,
    interestRateType,
    monthlyAmortization,
    isAmortizationOverridden,
    resolvedFirstPaymentDate,
    effectiveDueDay,
    manualPaidNumbers,
  ]);

  const scheduleSummaryRef = useRef(scheduleSummary);
  scheduleSummaryRef.current = scheduleSummary;

  // Toggle preview term paid status (stable)
  const togglePreviewTermPaid = useCallback((termNumber: number) => {
    setManualPaidNumbers((prev) => {
      const currentPaid =
        prev !== null
          ? prev
          : scheduleSummaryRef.current.schedule
              .filter((s) => s.isPaid)
              .map((s) => s.installmentNumber);

      if (currentPaid.includes(termNumber)) {
        return currentPaid.filter((n) => n !== termNumber);
      } else {
        return [...currentPaid, termNumber].sort((a, b) => a - b);
      }
    });
  }, []);

  // Reset form to initial state (stable)
  const resetForm = useCallback(() => {
    const init = initialValuesRef.current;
    setPrincipal(init?.principal !== undefined && init.principal !== null ? String(init.principal) : '');
    setTermMonths(init?.termMonths !== undefined && init.termMonths !== null ? String(init.termMonths) : '12');
    setInterestRateType(init?.interestRateType || 'monthly_addon');
    setInterestRate(init?.interestRate !== undefined && init.interestRate !== null ? String(init.interestRate) : '0');
    setMonthlyAmortizationState(
      init?.monthlyAmortization !== undefined && init.monthlyAmortization !== null ? String(init.monthlyAmortization) : ''
    );
    setIsAmortizationOverridden(Boolean(init?.isAmortizationOverridden));
    setTransactionDate(init?.startDate || new Date().toISOString().split('T')[0]);
    setFirstBillingMonth(init?.firstBillingMonth || '');
    setFirstPaymentDate(init?.firstPaymentDate || '');
    setDueDayState(init?.dueDay !== undefined && init.dueDay !== null ? String(init.dueDay) : '');
    setLinkedAccountType(init?.linkedAccountType || '');
    setCreditCardId(init?.creditCardId || '');
    setSavingsId(init?.savingsId || '');
    setManualPaidNumbers(init?.paidInstallmentNumbers || null);
  }, []);

  return {
    // State
    principal,
    termMonths,
    interestRateType,
    interestRate,
    monthlyAmortization,
    isAmortizationOverridden,
    transactionDate,
    firstBillingMonth,
    firstPaymentDate,
    resolvedFirstPaymentDate,
    dueDay,
    effectiveDueDay,
    linkedAccountType,
    creditCardId,
    savingsId,
    manualPaidNumbers,
    targetCard,
    selectedSavings,
    scheduleSummary,

    // Setters
    setPrincipal: handlePrincipalChange,
    setTermMonths: handleTermMonthsChange,
    setInterestRate: handleInterestRateChange,
    setInterestRateType: handleInterestRateTypeChange,
    setMonthlyAmortization: handleMonthlyAmortizationChange,
    setIsAmortizationOverridden,
    resetAmortizationOverride,
    setTransactionDate,
    setFirstBillingMonth,
    setFirstPaymentDate,
    setDueDay: setDueDayState,
    setCreditCardId: handleCreditCardSelect,
    setSavingsId,
    setLinkedAccountType: handleLinkedAccountTypeChange,
    setManualPaidNumbers,
    togglePreviewTermPaid,
    resetForm,
    recalculateAmortization,
  };
}
