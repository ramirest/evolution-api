import { Router } from 'express';
import { authRouter } from './auth.routes';

/**
 * Router principal do módulo Smart Broker
 * Centraliza todos os sub-routers
 */
export const smartBrokerRouter = Router();

// Montar sub-routers
smartBrokerRouter.use('/auth', authRouter);

// TODO: Adicionar outros routers conforme implementados
// smartBrokerRouter.use('/users', usersRouter);
// smartBrokerRouter.use('/agencies', agenciesRouter);
// smartBrokerRouter.use('/properties', propertiesRouter);
// smartBrokerRouter.use('/contacts', contactsRouter);
// smartBrokerRouter.use('/campaigns', campaignsRouter);
// smartBrokerRouter.use('/agents', agentsRouter);
