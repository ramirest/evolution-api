import { Router } from 'express';
import { authRouter } from './auth.routes';
import { propertiesRouter } from './properties.routes';
import { contactsRouter } from './contacts.routes';
import agenciesRouter from './agencies.routes';
import campaignsRouter from './campaigns.routes';
import agentsRouter from './agents.routes';
import { whatsappRouter } from './whatsapp.routes';
import { atendimentoRouter } from './atendimento.routes';
import { settingsRouter } from './settings.routes';
import { uploadRouter } from './upload.routes';

/**
 * Router principal do módulo Smart Broker
 * Centraliza todos os sub-routers
 */
export const smartBrokerRouter = Router();

// Montar sub-routers
smartBrokerRouter.use('/auth', authRouter);
smartBrokerRouter.use('/properties', propertiesRouter);
smartBrokerRouter.use('/contacts', contactsRouter);
smartBrokerRouter.use('/agencies', agenciesRouter);
smartBrokerRouter.use('/campaigns', campaignsRouter);
smartBrokerRouter.use('/agents', agentsRouter);
smartBrokerRouter.use('/whatsapp', whatsappRouter);
smartBrokerRouter.use('/atendimento', atendimentoRouter);
smartBrokerRouter.use('/settings', settingsRouter);
smartBrokerRouter.use('/upload', uploadRouter);
