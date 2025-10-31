import { Instance, IInstance } from '../models/instance.model';

/**
 * Repository para gerenciar instâncias WhatsApp no MongoDB
 * Provê métodos para CRUD com filtro por agência (RBAC)
 */
export class InstancesRepository {
  /**
   * Criar nova instância associada a uma agência
   */
  async create(data: {
    instanceName: string;
    agencyId: string;
    createdBy: string;
    webhookUrl?: string;
  }): Promise<IInstance> {
    const instance = new Instance(data);
    return await instance.save();
  }

  /**
   * Buscar todas as instâncias de uma agência
   */
  async findByAgency(agencyId: string): Promise<IInstance[]> {
    return await Instance.find({ agencyId, status: 'active' })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Buscar instância por nome
   */
  async findByName(instanceName: string): Promise<IInstance | null> {
    return await Instance.findOne({ instanceName }).exec();
  }

  /**
   * Verificar se instância pertence a uma agência
   */
  async belongsToAgency(instanceName: string, agencyId: string): Promise<boolean> {
    const instance = await Instance.findOne({ instanceName, agencyId }).exec();
    return !!instance;
  }

  /**
   * Atualizar instância
   */
  async update(
    instanceName: string,
    updates: Partial<Pick<IInstance, 'webhookUrl' | 'status'>>
  ): Promise<IInstance | null> {
    return await Instance.findOneAndUpdate(
      { instanceName },
      { $set: updates },
      { new: true }
    ).exec();
  }

  /**
   * Deletar instância (soft delete)
   */
  async delete(instanceName: string): Promise<void> {
    await Instance.findOneAndUpdate(
      { instanceName },
      { $set: { status: 'inactive' } }
    ).exec();
  }

  /**
   * Deletar instância permanentemente (hard delete)
   */
  async hardDelete(instanceName: string): Promise<void> {
    await Instance.deleteOne({ instanceName }).exec();
  }

  /**
   * Contar instâncias de uma agência
   */
  async countByAgency(agencyId: string): Promise<number> {
    return await Instance.countDocuments({ agencyId, status: 'active' }).exec();
  }
}
