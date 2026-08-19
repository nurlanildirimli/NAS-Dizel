import {
  type NewServiceNoteDraft,
  type NewServicePaymentDraft,
  type NewServiceVehicleDraft,
} from './newService';

export type ServiceDraftStatus = 'draft' | 'ready' | 'saved';

export type ServiceDraft = {
  id: string;
  vehicle: NewServiceVehicleDraft;
  serviceNote: NewServiceNoteDraft;
  payment: NewServicePaymentDraft;
  status: ServiceDraftStatus;
  createdAt: string;
  updatedAt: string;
};
