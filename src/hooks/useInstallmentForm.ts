'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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

  // Recalculates amortization based on inputs
  const recalculateAmortization = useCallback(
    (
      pVal: string = principal,
      nVal: string = termMonths,
      rVal: string = interestRate,
      type: InterestRateType = interestRateType
    ) => {
      const p = Number(pVal) || 0;
      const n = Number(nVal) || 0;
      const r = Number(rVal) || 0;

      if (p > 0 && n > 0) {
        const computed = calculateLiabilityAmortization({
          principal: p,
          termMonths: n,
          interestRate: r,
          rateType: type,
        });
        setMonthlyAmortizationState(computed > 0 ? String(computed) : '');
        setIsAmortizationOverridden(false);
      } else {
        setMonthlyAmortizationState('');
        setIsAmortizationOverridden(false);
      }
    },
    [principal, termMonths, interestRate, interestRateType]
  );

  // Setters with auto-recalculation
  const handlePrincipalChange = (val: string) => {
    setPrincipal(val);
    if (!isAmortizationOverridden) {
      recalculateAmortization(val, termMonths, interestRate, interestRateType);
    }
  };

  const handleTermMonthsChange = (val: string) => {
    setTermMonths(val);
    if (!isAmortizationOverridden) {
      recalculateAmortization(principal, val, interestRate, interestRateType);
    }
  };

  const handleInterestRateChange = (val: string) => {
    setInterestRate(val);
    if (!isAmortizationOverridden) {
      recalculateAmortization(principal, termMonths, val, interestRateType);
    }
  };

  const handleInterestRateTypeChange = (newType: InterestRateType) => {
    setInterestRateType(newType);
    recalculateAmortization(principal, termMonths, interestRate, newType);
  };

  const handleMonthlyAmortizationChange = (val: string) => {
    setMonthlyAmortizationState(val);
    setIsAmortizationOverridden(true);
  };

  const resetAmortizationOverride = () => {
    recalculateAmortization(principal, termMonths, interestRate, interestRateType);
  };

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

  // Credit Card selection handler
  const handleCreditCardSelect = (cardId: string) => {
    setCreditCardId(cardId);
    const card = creditCards.find((c) => c.id === cardId);
    if (card && card.due_day) {
      setDueDayState(String(card.due_day));
    }
  };

  // Linked account type change handler
  const handleLinkedAccountTypeChange = (type: LinkedAccountType | '') => {
    setLinkedAccountType(type);
    if (type === 'credit_card') {
      setSavingsId('');
      if (creditCards.length > 0 && !creditCardId) {
        handleCreditCardSelect(creditCards[0].id);
      }
    } else if (type === 'savings') {
      setCreditCardId('');
      if (savingsAccounts.length > 0 && !savingsId) {
        setSavingsId(savingsAccounts[0].id);
      }
    } else {
      setCreditCardId('');
      setSavingsId('');
    }
  };

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

  // Toggle preview term paid status
  const togglePreviewTermPaid = (termNumber: number) => {
    const currentPaid: number[] =
      manualPaidNumbers !== null
        ? manualPaidNumbers
        : scheduleSummary.schedule
            .filter((s) => s.isPaid)
            .map((s) => s.installmentNumber);

    if (currentPaid.includes(termNumber)) {
      setManualPaidNumbers(currentPaid.filter((n) => n !== termNumber));
    } else {
      setManualPaidNumbers([...currentPaid, termNumber].sort((a, b) => a - b));
    }
  };

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setPrincipal(initialValues?.principal !== undefined ? String(initialValues.principal) : '');
    setTermMonths(initialValues?.termMonths !== undefined ? String(initialValues.termMonths) : '12');
    setInterestRateType(initialValues?.interestRateType || 'monthly_addon');
    setInterestRate(initialValues?.interestRate !== undefined ? String(initialValues.interestRate) : '0');
    setMonthlyAmortizationState(
      initialValues?.monthlyAmortization !== undefined ? String(initialValues.monthlyAmortization) : ''
    );
    setIsAmortizationOverridden(Boolean(initialValues?.isAmortizationOverridden));
    setTransactionDate(initialValues?.startDate || new Date().toISOString().split('T')[0]);
    setFirstBillingMonth(initialValues?.firstBillingMonth || '');
    setFirstPaymentDate(initialValues?.firstPaymentDate || '');
    setDueDayState(initialValues?.dueDay !== undefined ? String(initialValues.dueDay) : '');
    setLinkedAccountType(initialValues?.linkedAccountType || '');
    setCreditCardId(initialValues?.creditCardId || '');
    setSavingsId(initialValues?.savingsId || '');
    setManualPaidNumbers(initialValues?.paidInstallmentNumbers || null);
  }, [initialValues]);

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
