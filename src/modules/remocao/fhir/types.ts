// =============================================================================
// FHIR R4 Types - Base types for interoperability
// =============================================================================
// Reference: https://hl7.org/fhir/R4/

export interface FhirElement {
  id?: string;
  extension?: FhirExtension[];
}

export interface FhirExtension extends FhirElement {
  url: string;
  valueString?: string;
  valueCode?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
  valueDecimal?: number;
  valueDateTime?: string;
  valueReference?: FhirReference;
  valuePeriod?: FhirPeriod;
  extension?: FhirExtension[];
}

export interface FhirReference extends FhirElement {
  reference?: string;
  type?: string;
  identifier?: FhirIdentifier;
  display?: string;
}

export interface FhirIdentifier extends FhirElement {
  use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
  type?: FhirCodeableConcept;
  system?: string;
  value?: string;
  period?: FhirPeriod;
  assigner?: FhirReference;
}

export interface FhirCodeableConcept extends FhirElement {
  coding?: FhirCoding[];
  text?: string;
}

export interface FhirCoding extends FhirElement {
  system?: string;
  version?: string;
  code?: string;
  display?: string;
  userSelected?: boolean;
}

export interface FhirPeriod extends FhirElement {
  start?: string;
  end?: string;
}

export interface FhirHumanName extends FhirElement {
  use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
  text?: string;
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
  period?: FhirPeriod;
}

export interface FhirContactPoint extends FhirElement {
  system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
  value?: string;
  use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
  rank?: number;
  period?: FhirPeriod;
}

export interface FhirAddress extends FhirElement {
  use?: 'home' | 'work' | 'temp' | 'old' | 'billing';
  type?: 'postal' | 'physical' | 'both';
  text?: string;
  line?: string[];
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  period?: FhirPeriod;
}

export interface FhirAttachment extends FhirElement {
  contentType?: string;
  language?: string;
  data?: string;
  url?: string;
  size?: number;
  hash?: string;
  title?: string;
  creation?: string;
}

export interface FhirMeta extends FhirElement {
  versionId?: string;
  lastUpdated?: string;
  source?: string;
  profile?: string[];
  security?: FhirCoding[];
  tag?: FhirCoding[];
}

export interface FhirNarrative extends FhirElement {
  status: 'generated' | 'extensions' | 'additional' | 'empty';
  div: string;
}

export interface FhirResource extends FhirElement {
  resourceType: string;
  id?: string;
  meta?: FhirMeta;
  implicitRules?: string;
  language?: string;
  text?: FhirNarrative;
  contained?: FhirResource[];
  extension?: FhirExtension[];
  modifierExtension?: FhirExtension[];
}