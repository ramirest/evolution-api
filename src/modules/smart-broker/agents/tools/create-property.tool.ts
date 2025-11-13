import { z } from 'zod';
import { AuthenticatedUser } from '../../types/auth.types';
import { propertiesService, CreatePropertyDto } from '../../services/properties.service';
import { PropertyType, TransactionType } from '../../models/property.model';
import { Logger } from '../../../../config/logger.config';

const logger = new Logger('CreatePropertyTool');

/**
 * FERRAMENTA: create_property
 * 
 * Esta ferramenta é um WRAPPER seguro em torno do PropertiesService.create().
 * Ela será chamada pelo Assistente Geral (Cockpit) para criar imóveis.
 * 
 * CRÍTICO: Segue o tools.instructions.md rigorosamente.
 */

// Schema de validação dos argumentos (usando Zod)
const CreatePropertyArgsSchema = z.object({
  type: z.nativeEnum(PropertyType),
  transactionType: z.nativeEnum(TransactionType),
  title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres'),
  description: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres'),
  price: z.number().positive('Preço deve ser positivo'),
  area: z.number().positive('Área deve ser positiva'),
  address: z.object({
    street: z.string().min(1, 'Rua é obrigatória'),
    number: z.string().min(1, 'Número é obrigatório'),
    complement: z.string().optional(),
    neighborhood: z.string().min(1, 'Bairro é obrigatório'),
    city: z.string().min(1, 'Cidade é obrigatória'),
    state: z.string().min(2, 'Estado é obrigatório'),
    zipCode: z.string().min(8, 'CEP é obrigatório'),
    country: z.string().optional(),
  }),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
  features: z.object({
    bedrooms: z.number().int().nonnegative().optional(),
    bathrooms: z.number().int().nonnegative().optional(),
    suites: z.number().int().nonnegative().optional(),
    parkingSpaces: z.number().int().nonnegative().optional(),
    hasElevator: z.boolean().optional(),
    hasPool: z.boolean().optional(),
    hasGym: z.boolean().optional(),
    hasGrill: z.boolean().optional(),
    isFurnished: z.boolean().optional(),
    petsAllowed: z.boolean().optional(),
  }).optional(),
  photos: z.array(z.string().url('URL da foto inválida')).optional(),
  iptuValue: z.number().positive().optional(),
  condominiumFee: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

export type CreatePropertyArgs = z.infer<typeof CreatePropertyArgsSchema>;

/**
 * Ferramenta: Criar Imóvel
 * 
 * @param user - O usuário autenticado (obrigatório para RBAC)
 * @param data - JSON string com os dados do imóvel a ser criado
 * @returns String descritiva do resultado para o agente
 */
export async function createPropertyTool(
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

    // 2. Validação com Zod
    const validation = CreatePropertyArgsSchema.safeParse(parsedData);
    if (!validation.success) {
      logger.warn(`[createPropertyTool] Validação falhou: ${validation.error.message}`);
      const errors = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return `Erro de validação dos argumentos: ${errors}. Por favor, corrija os dados e tente novamente.`;
    }

    const validatedArgs = validation.data;

    // 3. Construir o DTO para o serviço
    const createPropertyDto: any = {
      type: validatedArgs.type,
      transactionType: validatedArgs.transactionType,
      title: validatedArgs.title,
      description: validatedArgs.description,
      price: validatedArgs.price,
      area: validatedArgs.area,
      address: validatedArgs.address,
      location: validatedArgs.location,
      features: validatedArgs.features || {},
      photos: validatedArgs.photos,
      iptuValue: validatedArgs.iptuValue,
      condominiumFee: validatedArgs.condominiumFee,
      isActive: validatedArgs.isActive,
      agency: user.agencyId!, // Usa a agência do usuário autenticado
    };

    // 4. Chamar o serviço (PASSA O USER para RBAC)
    // NOTA: O PropertiesService.create já verifica se o user pode criar imóvel nesta agência
    const property = await propertiesService.create(createPropertyDto, user);

    // 5. Retornar resultado formatado para o agente
    const photosCount = property.photos?.length || 0;
    let resultText = `✅ Imóvel criado com sucesso!\n\n`;
    resultText += `**${property.title}**\n`;
    resultText += `- ID: ${property._id}\n`;
    resultText += `- Tipo: ${property.type} (${property.transactionType})\n`;
    resultText += `- Preço: R$ ${property.price.toLocaleString('pt-BR')}\n`;
    resultText += `- Área: ${property.area}m²\n`;
    resultText += `- Localização: ${property.address.neighborhood}, ${property.address.city}/${property.address.state}\n`;
    
    if (property.features.bedrooms) {
      resultText += `- Quartos: ${property.features.bedrooms}`;
      if (property.features.bathrooms) {
        resultText += ` | Banheiros: ${property.features.bathrooms}`;
      }
      resultText += `\n`;
    }
    
    if (photosCount > 0) {
      resultText += `- 📸 ${photosCount} foto(s) anexada(s)\n`;
    }

    resultText += `\nO imóvel está ativo e disponível no sistema.`;

    logger.info(`[createPropertyTool] Imóvel criado: ${property._id} por usuário ${user.email}`);
    return resultText;

  } catch (error: any) {
    // 6. Tratamento de erro
    logger.error(`[createPropertyTool] Erro ao executar ferramenta: ${error.message}`);
    
    // Mensagens específicas para erros comuns
    if (error.message.includes('permissão')) {
      return `❌ Erro de permissão: ${error.message}. Você precisa ser Manager ou Admin para criar imóveis.`;
    }
    
    if (error.message.includes('agência')) {
      return `❌ Erro: ${error.message}. Verifique se você está associado a uma agência válida.`;
    }
    
    return `❌ Erro ao criar imóvel: ${error.message}. Por favor, verifique os dados fornecidos e tente novamente.`;
  }
}
