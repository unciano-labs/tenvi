import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { ReceivableEntityClient } from './ReceivableEntityClient';
import { Contact, Property, Loan, BillSplit } from '@/types';

interface ReceivableEntityPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ReceivableEntityPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { title: 'Entity Details | Tenvi' };

  const { data: contact } = await supabase
    .from('bili_contacts')
    .select('name')
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .maybeSingle();

  if (contact?.name) {
    return {
      title: `${contact.name} - Receivables & Advance History | Tenvi`,
      description: `Complete statement, advances, bill splits, and records for ${contact.name}.`,
    };
  }

  const { data: property } = await supabase
    .from('bili_properties')
    .select('name')
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (property?.name) {
    return {
      title: `${property.name} - Receivables & Asset Records | Tenvi`,
      description: `All financial receivables and advances linked to ${property.name}.`,
    };
  }

  return {
    title: 'Receivable Entity Details | Tenvi',
    description: 'Detailed statement of advances and records.',
  };
}

export default async function ReceivableEntityPage({ params }: ReceivableEntityPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Fetch Contact or Property
  const [
    { data: contactData },
    { data: propertyData },
    { data: allContactsData },
    { data: allPropertiesData },
    { data: creditCardsData },
  ] = await Promise.all([
    supabase
      .from('bili_contacts')
      .select('*')
      .eq('id', id)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('bili_properties')
      .select('*')
      .eq('id', id)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('bili_contacts')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .order('name'),
    supabase
      .from('bili_properties')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .neq('status', 'sold')
      .order('name'),
    supabase
      .from('bili_credit_cards')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name'),
  ]);

  const allContacts: Contact[] = allContactsData || [];
  const allProperties: Property[] = allPropertiesData || [];

  // Determine effective contact ID and entity info
  let effectiveContactId = id;
  let entityName = contactData?.name || '';
  let entityPhone = contactData?.phone || null;
  let entityEmail = contactData?.email || null;
  let matchedProperty: Property | null = propertyData || null;

  if (!contactData && propertyData) {
    // Parameter was a property ID
    entityName = propertyData.name;
    const matchingContact = allContacts.find(
      (c) => c.name.toLowerCase() === propertyData.name.toLowerCase()
    );
    if (matchingContact) {
      effectiveContactId = matchingContact.id;
      entityPhone = matchingContact.phone || null;
      entityEmail = matchingContact.email || null;
    }
  } else if (contactData) {
    // Check if this contact corresponds to a registered property
    const propMatch = allProperties.find(
      (p) => p.name.toLowerCase() === contactData.name.toLowerCase()
    );
    if (propMatch) {
      matchedProperty = propMatch;
    }
  }

  // 2. Fetch Loans for this entity
  const { data: loansData } = await supabase
    .from('bili_loans')
    .select(`
      *,
      contact:bili_contacts(*),
      credit_card:bili_credit_cards(*),
      payments:bili_loan_payments(*),
      installments:bili_loan_installments(*)
    `)
    .eq('contact_id', effectiveContactId)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('loaned_on', { ascending: false });

  // 3. Fetch Bill Split Participants for this entity
  const { data: splitParticipantsData } = await supabase
    .from('bili_split_participants')
    .select(`
      *,
      contact:bili_contacts(*),
      split:bili_bill_splits(
        *,
        credit_card:bili_credit_cards(*)
      )
    `)
    .eq('contact_id', effectiveContactId)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  const loans = loansData || [];
  const splitParticipants = splitParticipantsData || [];

  // Fallback for name if contact was missing in bili_contacts but loans exist
  if (!entityName) {
    if (loans.length > 0) {
      entityName = (loans[0] as any).contact?.name || 'Debtor';
      entityPhone = loans[0].borrower_phone || null;
      entityEmail = loans[0].borrower_email || null;
    } else if (splitParticipants.length > 0) {
      entityName = (splitParticipants[0] as any).contact?.name || 'Debtor';
      entityPhone = (splitParticipants[0] as any).contact?.phone || null;
      entityEmail = (splitParticipants[0] as any).contact?.email || null;
    }
  }

  // If completely empty and neither contact nor property nor items exist, return 404
  if (!contactData && !propertyData && loans.length === 0 && splitParticipants.length === 0) {
    notFound();
  }

  return (
    <ReceivableEntityClient
      entityId={effectiveContactId}
      entityName={entityName || 'Debtor / Entity'}
      entityPhone={entityPhone}
      entityEmail={entityEmail}
      isProperty={Boolean(matchedProperty)}
      matchedProperty={matchedProperty}
      initialLoans={loans as any}
      initialSplitParticipants={splitParticipants as any}
      contacts={allContacts}
      properties={allProperties}
      creditCards={creditCardsData || []}
    />
  );
}
