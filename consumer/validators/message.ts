import * as joi from 'joi';

export const message_schema = joi
  .object({
    ts: joi.string().required(),
    dongleId: joi.string().required(),
    tvId: joi.string().required(),
    userPseudoId: joi.string().required(),
    channelId: joi.string().required(),
    distanceCm: joi.number().required(),
    rssi: joi.number().required(),
    seq: joi.number().required(),
  })
  .options({ stripUnknown: true })
  .required();
