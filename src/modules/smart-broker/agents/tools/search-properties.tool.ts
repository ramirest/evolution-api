import { z } from 'zod';
import { AuthenticatedUser } from '../../types/auth.types';
import { propertiesService, PropertyFilters } from '../../services/properties.service';
import { PropertyType, TransactionType } from '../../models/property.model';
import { Logger } from '../../../../config/logger.config';

const logger = new Logger('SearchPropertiesTool');

/**
 * FERRAMENTA: search_properties
 * 
 * Esta ferramenta é um WRAPPER seguro em torno do PropertiesService.
 * Ela será chamada pelo Agente Corretor Sênior (IA) para buscar imóveis.
 * 
 * CRÍTICO: Segue o tools.instructions.md rigorosamente.
 */

// Schema de validação dos argumentos (usando Zod)
const SearchPropertiesArgsSchema = z.object({
  type: z.nativeEnum(PropertyType).optional(),
  transactionType: z.nativeEnum(TransactionType).optional(),
  location: z.string().optional(),
  priceMin: z.number().positive().optional(),
  priceMax: z.number().positive().optional(),
  bedrooms: z.number().int().positive().optional(),
});

export type SearchPropertiesArgs = z.infer<typeof SearchPropertiesArgsSchema>;

/**
 * Ferramenta: Buscar Imóveis
 * 
 * @param user - O usuário autenticado (obrigatório para RBAC)
 * @param data - JSON string com os filtros de busca
 * @returns String descritiva dos resultados para o agente
 */
export async function searchPropertiesTool(
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
    const validation = SearchPropertiesArgsSchema.safeParse(parsedData);
    if (!validation.success) {
      logger.warn(`[searchPropertiesTool] Validação falhou: ${validation.error.message}`);
      return `Erro de validação dos argumentos: ${validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
    }

    const validatedArgs = validation.data;

    // 3. Construir os filtros para o serviço
    const filters: PropertyFilters = {
      type: validatedArgs.type,
      transactionType: validatedArgs.transactionType,
      minPrice: validatedArgs.priceMin,
      maxPrice: validatedArgs.priceMax,
      bedrooms: validatedArgs.bedrooms,
    };

    // Busca flexível por localização (city ou neighborhood)
    if (validatedArgs.location) {
      filters.city = validatedArgs.location;
      filters.neighborhood = validatedArgs.location;
    }

    // 4. Chamar o serviço (PASSA O USER para RBAC)
    // NOTA: O PropertiesService.findAll já aplica o filtro de agencyId baseado no user
    const properties = await propertiesService.findAll(user, filters);

    // 5. Retornar resultado formatado para o agente
    if (properties.length === 0) {
      return 'Não foram encontrados imóveis com os filtros especificados. Sugira ao cliente ampliar a busca ou notificar um corretor humano.';
    }

    // Formatar os primeiros 5 resultados (limite para evitar resposta muito longa)
    const limit = 5;
    const propertiesToShow = properties.slice(0, limit);
    const remainingCount = properties.length - limit;

    let resultText = `Encontrei ${properties.length} imóvel(is) que atendem aos critérios:\n\n`;

    propertiesToShow.forEach((property, index) => {
      resultText += `${index + 1}. **${property.title}**\n`;
      resultText += `   - Tipo: ${property.type} (${property.transactionType})\n`;
      resultText += `   - Preço: R$ ${property.price.toLocaleString('pt-BR')}\n`;
      resultText += `   - Localização: ${property.address.neighborhood}, ${property.address.city}\n`;
      resultText += `   - Quartos: ${property.features.bedrooms || 'N/A'} | Banheiros: ${property.features.bathrooms || 'N/A'}\n`;
      resultText += `   - ID: ${property._id}\n\n`;
    });

    if (remainingCount > 0) {
      resultText += `... e mais ${remainingCount} imóvel(is). Use esta lista para apresentar as melhores opções ao cliente.`;
    }

    logger.info(`[searchPropertiesTool] Encontrados ${properties.length} imóveis para usuário ${user.email}`);
    return resultText;

  } catch (error: any) {
    // 6. Tratamento de erro
    logger.error(`[searchPropertiesTool] Erro ao executar ferramenta: ${error.message}`);
    return `Erro ao buscar imóveis: ${error.message}. Por favor, notifique um corretor humano para ajudar o cliente.`;
  }
}
