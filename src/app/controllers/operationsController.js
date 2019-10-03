/**
 * Esse controller servirá de intermedio entre operações do usuario com o serviço.
 */

const express = require('express');

const router = express.Router();

const Service = require('../models/serviceModel.js');
const User = require('../models/userModel.js');
const authMiddleware = require('../middlewares/authMiddleware.js');

router.use(authMiddleware);

// ===================== Aceitação e Rejeição de Serviço ======================== //
router.get('/acceptService/:id', async (req, res) => {
  try {
    const { id } = req.params; // ID da lista de seviços para serem aceitos
    const provider = await User.findById(req.userId);

    if (!provider) {
      return res.status(400).send({ error: 'Usuário não existe' });
    }

    const providerLoc = provider.toAcceptServices.map(e => e.id).indexOf(id);

    provider.acceptedServices.push(provider.toAcceptServices[providerLoc]);
    provider.toAcceptServices.splice(providerLoc, 1);
    provider.save();

    /**
     * Aqui ficará o bloco de codigo para enviar uma noticação para o cliente
     * como? não sei, mas eu sei que vai ficar aqui
     */

    return res.send({ ok: 'Serviço aceito com sucesso' });
  } catch (error) {
    return res.status(400).send({ error: 'Erro em aceitar o serviço' });
  }
});
router.delete('/rejectService/:id', async (req, res) => {
  try {
    const { id } = req.params; // ID da lista de seviços para serem aceitos

    const provider = await User.findById(req.userId);
    const providerLoc = provider.toAcceptServices.map(e => e.id).indexOf(id);
    const clientId = provider.toAcceptServices[providerLoc].client;
    const user = await User.findById(clientId);

    if (!user) {
      return res.status(400).send({ error: 'Usuário não existe' });
    }

    if (!provider) {
      return res.status(400).send({ error: 'Usuário não existe' });
    }

    /**
     * Aqui ficará o bloco de codigo para enviar uma noticação para o prestador
     * como? não sei, mas eu sei que vai ficar aqui
     */
    const userLoc = user.contractedServices.map(e => e.service)
      .indexOf(provider.toAcceptServices[providerLoc].service);

    user.contractedServices.splice(userLoc, 1);
    provider.toAcceptServices.splice(providerLoc, 1);

    provider.save();
    user.save();

    return res.send({ ok: 'Serviço rejeitado com sucessor' });
  } catch (error) {
    return res.status(400).send({ error: 'Erro em rejeitar um serviço' });
  }
});
// ============================================================================== //

// ===================== Contrato e Cancelamento de Serviço ===================== //
router.post('/contractService/:id', async (req, res) => {
  try {
    const { id } = req.params; // ID do serviço requisitado
    const { location, dates } = req.body;

    const user = await User.findByIdAndUpdate(req.userId);

    const service = await Service.findById(id).populate('user');
    const provider = await User.findById(service.user.id);

    if (!user) {
      return res.status(400).send({ error: 'Usuário não existe' });
    }

    if (!service) {
      return res.status(400).send({ error: 'Serviço não existe' });
    }

    /**
     * Aqui ficará o bloco de codigo para enviar uma noticação para o prestador
     * como? não sei, mas eu sei que vai ficar aqui
     */

    user.contractedServices.push({ ...req.body, service: id });
    provider.toAcceptServices.push({
      service: id,
      location,
      dates,
      client: req.userId,
    });
    user.save();
    provider.save();

    return res.send({ ok: 'Serviço contratado com sucesso\nAguarde a aceitação do prestador' });
  } catch (error) {
    return res.status(400).send({ error: 'Erro em contratar um serviço' });
  }
});
router.delete('/cancelService/:id', async (req, res) => {
  try {
    const { id } = req.params; // ID do serviço cancelado

    const user = await User.findById(req.userId);

    const service = await Service.findById(id).populate('user');
    const provider = await User.findById(service.user.id);

    if (!user) {
      return res.status(400).send({ error: 'Usuário não existe' });
    }

    if (!service) {
      return res.status(400).send({ error: 'Serviço não existe' });
    }

    /**
     * Aqui ficará o bloco de codigo para enviar uma noticação para o prestador
     * como? não sei, mas eu sei que vai ficar aqui
     */
    const userLoc = user.contractedServices.map(e => e.service).indexOf(id);
    const providerLoc = provider.toAcceptServices.map(e => e.client).indexOf(req.userId);
    user.contractedServices.splice(userLoc, 1);
    provider.toAcceptServices.splice(providerLoc, 1);

    provider.save();
    user.save();

    return res.send({ ok: 'Serviço cancelado com sucessor' });
  } catch (error) {
    return res.status(400).send({ error: 'Erro em contratar um serviço' });
  }
});
// ============================================================================== //

// ==================== Rankear e Comentar um Serviço especifico ================ //
router.put('/rankService/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findById(id).populate('user');

    if (!service) {
      return res.status(400).send({ error: 'Serviço não existe' });
    }

    service.comments.push({ ...req.body, author: req.userId });

    const ranks = service.comments.map(item => item.rank);
    const totalRank = ranks.reduce((a, b) => a + b, 0);

    service.rank = totalRank / service.comments.length;
    service.save();

    return res.send({ ok: 'Comentario feito com sucesso' });
  } catch (error) {
    return res.status(400).send({ error: 'Erro em rankear o serviço' });
  }
});
// ============================================================================== //

module.exports = app => app.use('/operations', router);