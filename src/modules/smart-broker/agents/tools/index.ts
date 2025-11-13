/**
 * INDEX: Ferramentas do Agente (Tools)
 * 
 * Este arquivo exporta todas as ferramentas disponíveis para os agentes de IA.
 * 
 * ARQUITETURA:
 * - Cada ferramenta é um WRAPPER seguro em torno de um serviço de domínio.
 * - Todas as ferramentas seguem o checklist do tools.instructions.md.
 * - Todas as ferramentas recebem o objeto `user` (AuthenticatedUser) para RBAC.
 */

// Ferramentas do Agente Corretor Sênior (Atendimento 24/7)
export { searchPropertiesTool } from './search-properties.tool';
export { getPropertyDetailsTool } from './get-property-details.tool';
export { sendPropertyPhotosTool } from './send-property-photos.tool';
export { scheduleVisitTool } from './schedule-visit.tool';
export { transferToHumanTool } from './transfer-to-human.tool';

// Ferramentas do Assistente Geral (Cockpit)
export { createPropertyTool } from './create-property.tool';
// export { updatePropertyTool } from './update-property.tool';
// export { deletePropertyTool } from './delete-property.tool';
// export { searchContactsTool } from './search-contacts.tool';
// export { getContactDetailsTool } from './get-contact-details.tool';
// export { createContactTool } from './create-contact.tool';
// export { updateContactTool } from './update-contact.tool';
// export { triggerUiOpenModalTool } from './trigger-ui-open-modal.tool';
