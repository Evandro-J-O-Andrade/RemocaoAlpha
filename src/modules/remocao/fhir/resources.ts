// =============================================================================
// FHIR R4 Resource Types - Domain-specific resources
// =============================================================================

import type {
  FhirResource,
  FhirIdentifier,
  FhirCodeableConcept,
  FhirReference,
  FhirPeriod,
  FhirHumanName,
  FhirContactPoint,
  FhirAddress,
  FhirAttachment,
  FhirElement,
} from './types';

// =============================================================================
// Organization - Empresa de remoção, hospital, organização prestadora
// =============================================================================
export interface FhirOrganization extends FhirResource {
  resourceType: 'Organization';
  identifier?: FhirIdentifier[];
  active?: boolean;
  type?: FhirCodeableConcept[];
  name?: string;
  alias?: string[];
  telecom?: FhirContactPoint[];
  address?: FhirAddress[];
  partOf?: FhirReference;
  contact?: FhirOrganizationContact[];
  endpoint?: FhirReference[];
}

export interface FhirOrganizationContact extends FhirElement {
  purpose?: FhirCodeableConcept;
  name?: FhirHumanName;
  telecom?: FhirContactPoint[];
  address?: FhirAddress[];
}

// =============================================================================
// Location - Hospital, unidade, base, local de origem/destino
// =============================================================================
export interface FhirLocation extends FhirResource {
  resourceType: 'Location';
  identifier?: FhirIdentifier[];
  status?: 'active' | 'suspended' | 'inactive';
  operationalStatus?: FhirCodeableConcept;
  name?: string;
  alias?: string[];
  description?: string;
  mode?: 'instance' | 'kind';
  type?: FhirCodeableConcept[];
  telecom?: FhirContactPoint[];
  address?: FhirAddress[];
  physicalType?: FhirCodeableConcept;
  position?: FhirLocationPosition;
  managingOrganization?: FhirReference;
  partOf?: FhirReference;
  endpoint?: FhirReference[];
}

export interface FhirLocationPosition extends FhirElement {
  longitude: number;
  latitude: number;
  altitude?: number;
}

// =============================================================================
// Patient - Representação interoperável do paciente
// =============================================================================
export interface FhirPatient extends FhirResource {
  resourceType: 'Patient';
  identifier?: FhirIdentifier[];
  active?: boolean;
  name?: FhirHumanName[];
  telecom?: FhirContactPoint[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  deceasedBoolean?: boolean;
  deceasedDateTime?: string;
  address?: FhirAddress[];
  maritalStatus?: FhirCodeableConcept;
  multipleBirthBoolean?: boolean;
  multipleBirthInteger?: number;
  photo?: FhirAttachment[];
  contact?: FhirPatientContact[];
  communication?: FhirPatientCommunication[];
  generalPractitioner?: FhirReference[];
  managingOrganization?: FhirReference;
  link?: FhirPatientLink[];
}

export interface FhirPatientContact extends FhirElement {
  relationship?: FhirCodeableConcept[];
  name?: FhirHumanName;
  telecom?: FhirContactPoint[];
  address?: FhirAddress[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  organization?: FhirReference;
  period?: FhirPeriod;
}

export interface FhirPatientCommunication extends FhirElement {
  language: FhirCodeableConcept;
  preferred?: boolean;
}

export interface FhirPatientLink extends FhirElement {
  other: FhirReference;
  type: 'replaced-by' | 'replaces' | 'refer' | 'seealso';
}

// =============================================================================
// Practitioner - Profissional (motorista, enfermeiro, médico)
// =============================================================================
export interface FhirPractitioner extends FhirResource {
  resourceType: 'Practitioner';
  identifier?: FhirIdentifier[];
  active?: boolean;
  name?: FhirHumanName[];
  telecom?: FhirContactPoint[];
  address?: FhirAddress[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  photo?: FhirAttachment[];
  qualification?: FhirPractitionerQualification[];
  communication?: FhirCodeableConcept[];
}

export interface FhirPractitionerQualification extends FhirElement {
  identifier?: FhirIdentifier[];
  code: FhirCodeableConcept;
  period?: FhirPeriod;
  issuer?: FhirReference;
}

// =============================================================================
// PractitionerRole - Papel exercido pelo profissional na organização
// =============================================================================
export interface FhirPractitionerRole extends FhirResource {
  resourceType: 'PractitionerRole';
  identifier?: FhirIdentifier[];
  active?: boolean;
  period?: FhirPeriod;
  practitioner: FhirReference;
  organization: FhirReference;
  code?: FhirCodeableConcept[];
  specialty?: FhirCodeableConcept[];
  location?: FhirReference[];
  healthcareService?: FhirReference[];
  telecom?: FhirContactPoint[];
  availableTime?: FhirAvailableTime[];
  notAvailable?: FhirNotAvailable[];
  availabilityExceptions?: string;
  endpoint?: FhirReference[];
}

export interface FhirAvailableTime extends FhirElement {
  daysOfWeek?: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
  allDay?: boolean;
  availableStartTime?: string;
  availableEndTime?: string;
}

export interface FhirNotAvailable extends FhirElement {
  description: string;
  during?: FhirPeriod;
}

// =============================================================================
// ServiceRequest - Solicitação do serviço de remoção
// =============================================================================
export interface FhirServiceRequest extends FhirResource {
  resourceType: 'ServiceRequest';
  identifier?: FhirIdentifier[];
  instantiatesCanonical?: string[];
  instantiatesUri?: string[];
  basedOn?: FhirReference[];
  replaces?: FhirReference[];
  requisition?: FhirIdentifier;
  status: 'draft' | 'active' | 'on-hold' | 'revoked' | 'completed' | 'entered-in-error' | 'unknown';
  intent: 'proposal' | 'plan' | 'directive' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';
  category?: FhirCodeableConcept[];
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
  doNotPerform?: boolean;
  code?: FhirCodeableConcept;
  orderDetail?: FhirCodeableConcept[];
  quantityQuantity?: FhirQuantity;
  quantityRatio?: FhirRatio;
  quantityRange?: FhirRange;
  subject?: FhirReference;
  encounter?: FhirReference;
  occurrenceDateTime?: string;
  occurrencePeriod?: FhirPeriod;
  occurrenceTiming?: FhirTiming;
  authoredOn?: string;
  requester?: FhirReference;
  performerType?: FhirCodeableConcept[];
  performer?: FhirReference[];
  locationCode?: FhirCodeableConcept[];
  locationReference?: FhirReference[];
  reasonCode?: FhirCodeableConcept[];
  reasonReference?: FhirReference[];
  insurance?: FhirReference[];
  supportingInfo?: FhirReference[];
  note?: FhirAnnotation[];
  patientInstruction?: string;
  relevantHistory?: FhirReference[];
}

export interface FhirQuantity extends FhirElement {
  value?: number;
  comparator?: '<' | '<=' | '>=' | '>';
  unit?: string;
  system?: string;
  code?: string;
}

export interface FhirRatio extends FhirElement {
  numerator?: FhirQuantity;
  denominator?: FhirQuantity;
}

export interface FhirRange extends FhirElement {
  low?: FhirQuantity;
  high?: FhirQuantity;
}

export interface FhirTiming extends FhirElement {
  event?: string[];
  repeat?: FhirTimingRepeat;
  code?: FhirCodeableConcept;
}

export interface FhirTimingRepeat extends FhirElement {
  boundsDuration?: FhirQuantity;
  boundsRange?: FhirRange;
  boundsPeriod?: FhirPeriod;
  count?: number;
  countMax?: number;
  duration?: number;
  durationMax?: number;
  durationUnit?: 's' | 'min' | 'h' | 'd' | 'wk' | 'mo' | 'a';
  frequency?: number;
  frequencyMax?: number;
  period?: number;
  periodMax?: number;
  periodUnit?: 's' | 'min' | 'h' | 'd' | 'wk' | 'mo' | 'a';
  dayOfWeek?: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
  timeOfDay?: string[];
  when?: string[];
  offset?: number;
}

export interface FhirAnnotation extends FhirElement {
  authorReference?: FhirReference;
  authorString?: string;
  time?: string;
  text: string;
}

// =============================================================================
// Task - Execução, despacho e acompanhamento operacional
// =============================================================================
export interface FhirTask extends FhirResource {
  resourceType: 'Task';
  identifier?: FhirIdentifier[];
  instantiatesCanonical?: string[];
  instantiatesUri?: string[];
  basedOn?: FhirReference[];
  groupIdentifier?: FhirIdentifier;
  partOf?: FhirReference[];
  status: 'draft' | 'requested' | 'received' | 'accepted' | 'rejected' | 'ready' | 'cancelled' | 'in-progress' | 'on-hold' | 'failed' | 'completed' | 'entered-in-error';
  statusReason?: FhirCodeableConcept;
  businessStatus?: FhirCodeableConcept;
  intent: 'unknown' | 'proposal' | 'plan' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
  code?: FhirCodeableConcept;
  description?: string;
  focus?: FhirReference;
  for?: FhirReference;
  encounter?: FhirReference;
  executionPeriod?: FhirPeriod;
  authoredOn?: string;
  lastModified?: string;
  requester?: FhirReference;
  performerType?: FhirCodeableConcept[];
  performer?: FhirTaskPerformer[];
  owner?: FhirReference;
  location?: FhirReference;
  reasonCode?: FhirCodeableConcept[];
  reasonReference?: FhirReference[];
  insurance?: FhirReference[];
  note?: FhirAnnotation[];
  relevantHistory?: FhirReference[];
  restriction?: FhirTaskRestriction;
  input?: FhirTaskInput[];
  output?: FhirTaskOutput[];
}

export interface FhirTaskPerformer extends FhirElement {
  actor?: FhirReference;
  function?: FhirCodeableConcept;
}

export interface FhirTaskRestriction extends FhirElement {
  repetitions?: number;
  period?: FhirPeriod;
  recipient?: FhirReference[];
}

export interface FhirTaskInput extends FhirElement {
  type: FhirCodeableConcept;
  valueBase64Binary?: string;
  valueBoolean?: boolean;
  valueCode?: string;
  valueDate?: string;
  valueDateTime?: string;
  valueDecimal?: number;
  valueId?: string;
  valueInstant?: string;
  valueInteger?: number;
  valueMarkdown?: string;
  valueOid?: string;
  valuePositiveInt?: number;
  valueString?: string;
  valueTime?: string;
  valueUnsignedInt?: number;
  valueUri?: string;
  valueAddress?: FhirAddress;
  valueAge?: FhirQuantity;
  valueAnnotation?: FhirAnnotation;
  valueAttachment?: FhirAttachment;
  valueCodeableConcept?: FhirCodeableConcept;
  valueCoding?: FhirCoding;
  valueContactPoint?: FhirContactPoint;
  valueCount?: FhirQuantity;
  valueDistance?: FhirQuantity;
  valueDuration?: FhirQuantity;
  valueHumanName?: FhirHumanName;
  valueIdentifier?: FhirIdentifier;
  valueMoney?: FhirQuantity;
  valuePeriod?: FhirPeriod;
  valueQuantity?: FhirQuantity;
  valueRange?: FhirRange;
  valueRatio?: FhirRatio;
  valueReference?: FhirReference;
  valueSampledData?: FhirSampledData;
  valueSignature?: FhirSignature;
  valueTiming?: FhirTiming;
  valueContactDetail?: FhirContactDetail;
  valueDataRequirement?: FhirDataRequirement;
  valueExpression?: FhirExpression;
  valueParameterDefinition?: FhirParameterDefinition;
  valueRelatedArtifact?: FhirRelatedArtifact;
  valueTriggerDefinition?: FhirTriggerDefinition;
  valueUsageContext?: FhirUsageContext;
  valueAvailability?: FhirAvailability;
  valueExtendedContactDetail?: FhirExtendedContactDetail;
}

export interface FhirTaskOutput extends FhirElement {
  type: FhirCodeableConcept;
  valueBase64Binary?: string;
  valueBoolean?: boolean;
  valueCode?: string;
  valueDate?: string;
  valueDateTime?: string;
  valueDecimal?: number;
  valueId?: string;
  valueInstant?: string;
  valueInteger?: number;
  valueMarkdown?: string;
  valueOid?: string;
  valuePositiveInt?: number;
  valueString?: string;
  valueTime?: string;
  valueUnsignedInt?: number;
  valueUri?: string;
  valueAddress?: FhirAddress;
  valueAge?: FhirQuantity;
  valueAnnotation?: FhirAnnotation;
  valueAttachment?: FhirAttachment;
  valueCodeableConcept?: FhirCodeableConcept;
  valueCoding?: FhirCoding;
  valueContactPoint?: FhirContactPoint;
  valueCount?: FhirQuantity;
  valueDistance?: FhirQuantity;
  valueDuration?: FhirQuantity;
  valueHumanName?: FhirHumanName;
  valueIdentifier?: FhirIdentifier;
  valueMoney?: FhirQuantity;
  valuePeriod?: FhirPeriod;
  valueQuantity?: FhirQuantity;
  valueRange?: FhirRange;
  valueRatio?: FhirRatio;
  valueReference?: FhirReference;
  valueSampledData?: FhirSampledData;
  valueSignature?: FhirSignature;
  valueTiming?: FhirTiming;
  valueContactDetail?: FhirContactDetail;
  valueDataRequirement?: FhirDataRequirement;
  valueExpression?: FhirExpression;
  valueParameterDefinition?: FhirParameterDefinition;
  valueRelatedArtifact?: FhirRelatedArtifact;
  valueTriggerDefinition?: FhirTriggerDefinition;
  valueUsageContext?: FhirUsageContext;
  valueAvailability?: FhirAvailability;
  valueExtendedContactDetail?: FhirExtendedContactDetail;
}

export interface FhirSampledData extends FhirElement {
  origin: FhirQuantity;
  period: number;
  factor?: number;
  lowerLimit?: number;
  upperLimit?: number;
  dimensions: number;
  data?: string;
}

export interface FhirSignature extends FhirElement {
  type: FhirCoding[];
  when: string;
  who: FhirReference;
  onBehalfOf?: FhirReference;
  targetFormat?: string;
  sigFormat?: string;
  data?: string;
}

export interface FhirContactDetail extends FhirElement {
  name?: string;
  telecom?: FhirContactPoint[];
}

export interface FhirDataRequirement extends FhirElement {
  type: string;
  profile?: string[];
  subjectCodeableConcept?: FhirCodeableConcept;
  subjectReference?: FhirReference;
  mustSupport?: string[];
  codeFilter?: FhirDataRequirementCodeFilter[];
  dateFilter?: FhirDataRequirementDateFilter[];
  limit?: number;
  sort?: FhirDataRequirementSort[];
}

export interface FhirDataRequirementCodeFilter extends FhirElement {
  path?: string;
  valueSet?: string;
  code?: FhirCoding[];
}

export interface FhirDataRequirementDateFilter extends FhirElement {
  path?: string;
  valueDateTime?: string;
  valuePeriod?: FhirPeriod;
  valueDuration?: FhirQuantity;
}

export interface FhirDataRequirementSort extends FhirElement {
  path: string;
  direction: 'ascending' | 'descending';
}

export interface FhirExpression extends FhirElement {
  description?: string;
  name?: string;
  language: string;
  expression?: string;
  reference?: string;
}

export interface FhirParameterDefinition extends FhirElement {
  name: string;
  use: 'in' | 'out';
  min?: number;
  max?: string;
  documentation?: string;
  type: string;
  profile?: string;
}

export interface FhirRelatedArtifact extends FhirElement {
  type: 'documentation' | 'justification' | 'citation' | 'predecessor' | 'successor' | 'derived-from' | 'depends-on' | 'composed-of';
  label?: string;
  display?: string;
  citation?: string;
  url?: string;
  document?: FhirAttachment;
  resource?: string;
}

export interface FhirTriggerDefinition extends FhirElement {
  type: 'named-event' | 'periodic' | 'data-changed' | 'data-added' | 'data-modified' | 'data-removed' | 'data-accessed' | 'data-access-ended';
  name?: string;
  timingTiming?: FhirTiming;
  timingReference?: FhirReference;
  timingDate?: string;
  timingDateTime?: string;
  data?: FhirDataRequirement[];
  condition?: FhirExpression;
}

export interface FhirUsageContext extends FhirElement {
  code: FhirCoding;
  valueCodeableConcept?: FhirCodeableConcept;
  valueQuantity?: FhirQuantity;
  valueRange?: FhirRange;
  valueReference?: FhirReference;
}

export interface FhirAvailability extends FhirElement {
  identifier?: FhirIdentifier[];
  location?: FhirReference;
  schedule?: FhirSchedule[];
}

export interface FhirSchedule extends FhirElement {
  serviceType?: FhirCodeableConcept[];
  specialty?: FhirCodeableConcept[];
  actor?: FhirReference[];
  planningHorizon?: FhirPeriod;
  comment?: string;
}

export interface FhirExtendedContactDetail extends FhirElement {
  name?: string;
  telecom?: FhirContactPoint[];
  address?: FhirAddress;
  organization?: FhirReference;
}

export interface FhirCoding extends FhirElement {
  system?: string;
  version?: string;
  code?: string;
  display?: string;
  userSelected?: boolean;
}

// =============================================================================
// Encounter - Atendimento efetivamente realizado
// =============================================================================
export interface FhirEncounter extends FhirResource {
  resourceType: 'Encounter';
  identifier?: FhirIdentifier[];
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled' | 'entered-in-error' | 'unknown';
  statusHistory?: FhirEncounterStatusHistory[];
  class?: FhirCoding;
  classHistory?: FhirEncounterClassHistory[];
  type?: FhirCodeableConcept[];
  serviceType?: FhirCodeableConcept;
  priority?: FhirCodeableConcept;
  subject?: FhirReference;
  episodeOfCare?: FhirReference[];
  basedOn?: FhirReference[];
  participant?: FhirEncounterParticipant[];
  appointment?: FhirReference[];
  period?: FhirPeriod;
  length?: FhirQuantity;
  reasonCode?: FhirCodeableConcept[];
  reasonReference?: FhirReference[];
  diagnosis?: FhirEncounterDiagnosis[];
  account?: FhirReference[];
  hospitalization?: FhirEncounterHospitalization;
  location?: FhirEncounterLocation[];
  serviceProvider?: FhirReference;
  partOf?: FhirReference;
}

export interface FhirEncounterStatusHistory extends FhirElement {
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled' | 'entered-in-error' | 'unknown';
  period: FhirPeriod;
}

export interface FhirEncounterClassHistory extends FhirElement {
  class: FhirCoding;
  period: FhirPeriod;
}

export interface FhirEncounterParticipant extends FhirElement {
  type?: FhirCodeableConcept[];
  period?: FhirPeriod;
  actor?: FhirReference;
}

export interface FhirEncounterDiagnosis extends FhirElement {
  condition?: FhirReference;
  use?: FhirCodeableConcept;
  rank?: number;
}

export interface FhirEncounterHospitalization extends FhirElement {
  preAdmissionIdentifier?: FhirIdentifier;
  origin?: FhirReference;
  admitSource?: FhirCodeableConcept;
  reAdmission?: FhirCodeableConcept;
  dietPreference?: FhirCodeableConcept[];
  specialCourtesy?: FhirCodeableConcept[];
  specialArrangement?: FhirCodeableConcept[];
  destination?: FhirReference;
  dischargeDisposition?: FhirCodeableConcept;
  dischargeDiagnosis?: FhirReference[];
}

export interface FhirEncounterLocation extends FhirElement {
  location: FhirReference;
  status: 'planned' | 'active' | 'reserved' | 'completed';
  physicalType?: FhirCodeableConcept;
  period?: FhirPeriod;
}

// =============================================================================
// AuditEvent - Auditoria de eventos para interoperabilidade
// =============================================================================
export interface FhirAuditEvent extends FhirResource {
  resourceType: 'AuditEvent';
  type: FhirCoding;
  subtype?: FhirCoding[];
  action?: 'C' | 'R' | 'U' | 'D' | 'E';
  recorded: string;
  outcome?: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | '13' | '14' | '15';
  outcomeDesc?: string;
  purposeOfEvent?: FhirCodeableConcept[];
  agent: FhirAuditEventAgent[];
  source: FhirAuditEventSource;
  entity?: FhirAuditEventEntity[];
}

export interface FhirAuditEventAgent extends FhirElement {
  type?: FhirCodeableConcept;
  role?: FhirCodeableConcept[];
  who?: FhirReference;
  altId?: string;
  name?: string;
  requestor: boolean;
  location?: FhirReference;
  policy?: string[];
  media?: FhirCoding;
  network?: FhirAuditEventAgentNetwork;
  purposeOfUse?: FhirCodeableConcept[];
}

export interface FhirAuditEventAgentNetwork extends FhirElement {
  address?: string;
  type?: 'machine' | 'applicationserver' | 'database' | 'application' | 'proxy' | 'other';
}

export interface FhirAuditEventSource extends FhirElement {
  site?: string;
  identifier?: FhirIdentifier;
  type?: FhirCoding[];
}

export interface FhirAuditEventEntity extends FhirElement {
  what?: FhirReference;
  type?: FhirCoding;
  role?: '1' | '2' | '3' | '4';
  lifecycle?: FhirCoding;
  securityLabel?: FhirCoding[];
  name?: string;
  description?: string;
  query?: string;
  detail?: FhirAuditEventEntityDetail[];
}

export interface FhirAuditEventEntityDetail extends FhirElement {
  type: string;
  valueBase64Binary?: string;
  valueBoolean?: boolean;
  valueCode?: string;
  valueDate?: string;
  valueDateTime?: string;
  valueDecimal?: number;
  valueId?: string;
  valueInstant?: string;
  valueInteger?: number;
  valueMarkdown?: string;
  valueOid?: string;
  valuePositiveInt?: number;
  valueString?: string;
  valueTime?: string;
  valueUnsignedInt?: number;
  valueUri?: string;
}