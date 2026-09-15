export interface RulesSectionCopy {
  heading: string
  lead?: string
  bullets: readonly string[]
}

export interface Messages {
  /** Redesign copy. */
  heroTitle: string
  heroLead: string
  heroLeadEmphasis: string
  boardTitle: string
  liveCount: string
  claimRank: string
  takeoverTitle: string
  takeoverLead: string
  takeoverNow: string
  boardFooter: string
  navStats: string
  droppingSoon: string

  navRules: string
  navGitHub: string
  navSite: string
  homeAria: string
  language: string
  visitorsOnline: string
  visitorsLast24h: string
  seeStats: string
  footerBlurb: string
  footerStats: string

  tagline: string
  taglineEmphasis: string
  claimRankFor: string
  takePageOneFor: string
  decreaseBid: string
  increaseBid: string
  explainerTakeover: string
  explainerBid: string
  identityLabel: string
  identityPlaceholder: string
  bid: string
  sponsor: string
  takeOver: string
  working: string
  helpUnavailable: string
  helpResolving: string
  helpResolveFailed: string
  helpDefault: string
  helpSponsor: string
  helpPass: string
  title: string
  titlePlaceholder: string
  description: string
  descriptionPlaceholder: string
  imageUrl: string
  optional: string
  takeoverAria: string
  takeoverNew: string
  takeoverOwn: string
  takeoverFalls: string
  takeoverNextDrop: string
  takeoverAtFloor: string
  takeoverActive: string
  boardHeading: string
  refresh: string
  pagesAria: string
  prev: string
  next: string
  takeoverLiveKicker: string
  takeoverOwnsUntil: string
  browseRegular: string
  emptyBoard: string
  passFor: string
  passForAria: string
  sponsorForAria: string
  daysLeft: string
  dayLeft: string
  runwayAria: string
  currentAmountAria: string
  initialAmountAria: string
  onBoardUntil: string
  clicks: string
  defaultDescription: string
  checkoutKicker: string
  reviewBid: string
  reviewSponsor: string
  reviewTakeover: string
  listing: string
  placement: string
  placementTakeover: string
  projectedRank: string
  total: string
  paymentNote: string
  confirmMock: string
  cancel: string

  ageNow: string
  ageMinute: string
  ageMinutes: string
  ageHour: string
  ageHours: string
  ageDay: string
  ageDays: string

  errorIdentityEmpty: string
  errorIdentityInvalid: string
  errorIdentityHttp: string
  errorIdentityInvite: string
  errorCheckoutStart: string
  errorMockSettle: string

  notFoundTitle: string
  notFoundLead: string
  backToBoard: string

  rulesKicker: string
  rulesTitle: string
  rulesLead: string
  rulesSections: readonly RulesSectionCopy[]
  rulesCanonicalHeading: string
  rulesCanonicalRules: string
  rulesCanonicalBoard: string
  rulesCanonicalStats: string

  statsKicker: string
  statsTitle: string
  statsLead: string
  updated: string
  statOnline: string
  statHour: string
  statDay: string
  statViews: string
  statClicks: string
  statListings: string
  statVolume: string
  statFirst: string
  statTakeover: string
  takeoverNone: string
  recentSettlements: string
  noSettlements: string

  paidSettled: string
  checkoutReturn: string
  pageOneYours: string
  claimedRank: string
  needsReview: string
  checkoutExpired: string
  waitingPayment: string
  pendingIdentity: string
  amount: string
  status: string
  awaitingLead: string
  takeoverActiveUntil: string
  expiredLead: string
  supportLead: string
  seeBoard: string
  receiptKicker: string
  noCheckout: string
  noCheckoutLead: string
  backToYoubid: string
}
