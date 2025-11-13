import { z } from 'zod';
import { AuthenticatedUser } from '../../types/auth.types';
import { propertiesService } from '../../services/properties.service';
import { Logger } from '../../../../config/logger.config';

const logger = new Logger('GetPropertyDetailsTool');

/**
 * FERRAMENTA: get_property_details
 * 
 * Busca detalhes completos de um imóvel específico.
 */

const GetPropertyDetailsArgsSchema = z.object({
  propertyId: z.string().min(1, 'O campo propertyId é obrigatório'),
});

export type GetPropertyDetailsArgs = z.infer<typeof GetPropertyDetailsArgsSchema>;

export async function getPropertyDetailsTool(
  user: AuthenticatedUser,
  data: string,
): Promise<string> {
  try {
    // 1. Parse do JSON
    let parsedData: any;
    try {
      parsedData = JSON.parse(data);
    } catch (parseError) {
      return 'Erro: O argumento "data" deve ser um JSON válido.';
    }

    // 2. Validação
    const validation = GetPropertyDetailsArgsSchema.safeParse(parsedData);
    if (!validation.success) {
      logger.warn(`[getPropertyDetailsTool] Validação falhou: ${validation.error.message}`);
      return `Erro de validação: ${validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
    }

    const { propertyId } = validation.data;

    // 3. Chamar o serviço (RBAC aplicado automaticamente)
    const property = await propertiesService.findOne(propertyId, user);

    // 4. Formatar resposta
    let resultText = `📋 **Detalhes do Imóvel**\n\n`;
    resultText += `**${property.title}**\n`;
    resultText += `Tipo: ${property.type} - ${property.transactionType}\n`;
    resultText += `Preço: R$ ${property.price.toLocaleString('pt-BR')}\n`;
    resultText += `Área: ${property.area}m²\n\n`;
    
    resultText += `📍 **Localização:**\n`;
    resultText += `${property.address.street}, ${property.address.number}\n`;
    resultText += `${property.address.neighborhood}, ${property.address.city} - ${property.address.state}\n`;
    resultText += `CEP: ${property.address.zipCode}\n\n`;
    
    resultText += `🏠 **Características:**\n`;
    resultText += `- Quartos: ${property.features.bedrooms || 'N/A'}\n`;
    resultText += `- Banheiros: ${property.features.bathrooms || 'N/A'}\n`;
    resultText += `- Vagas: ${property.features.parkingSpaces || 'N/A'}\n`;
    if (property.features.suites) resultText += `- Suítes: ${property.features.suites}\n`;
    
    const amenities = [];
    if (property.features.elevator) amenities.push('Elevador');
    if (property.features.pool) amenities.push('Piscina');
    if (property.features.gym) amenities.push('Academia');
    if (property.features.barbecue) amenities.push('Churrasqueira');
    if (property.features.furnished) amenities.push('Mobiliado');
    if (property.features.garden) amenities.push('Jardim');
    if (property.features.airConditioning) amenities.push('Ar Condicionado');
    if (property.features.security) amenities.push('Segurança');
    
    if (amenities.length > 0) {
      resultText += `\n✨ **Comodidades:** ${amenities.join(', ')}\n`;
    }

    if (property.description) {
      resultText += `\n📝 **Descrição:**\n${property.description}\n`;
    }

    if (property.photos && property.photos.length > 0) {
      resultText += `\n📸 Este imóvel tem ${property.photos.length} foto(s). Use a ferramenta send_property_photos para enviá-las ao cliente.\n`;
    }

    resultText += `\nID do Imóvel: ${property._id}`;

    logger.info(`[getPropertyDetailsTool] Detalhes do imóvel ${propertyId} recuperados para usuário ${user.email}`);
    return resultText;

  } catch (error: any) {
    logger.error(`[getPropertyDetailsTool] Erro ao executar ferramenta: ${error.message}`);
    return `Erro ao buscar detalhes do imóvel: ${error.message}`;
  }
}
