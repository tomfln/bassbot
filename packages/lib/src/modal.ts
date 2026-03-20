import { randomUUIDv7 } from "bun";
import { ActionRowBuilder, ModalBuilder, ModalSubmitInteraction, TextInputBuilder, TextInputStyle, type Interaction } from "discord.js";

type ModalCapableInteraction = Extract<Interaction, { showModal: any }>

export interface ModalConfig {
  title: string;
  fields: Record<string, {
    label?: string;
    type?: TextInputStyle;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    placeholder?: string;
    value?: string;
  }>
}

type CreateModalReturnType<Cfg extends ModalConfig> = {
  [K in keyof Cfg["fields"]]: string
}

type ModalShowOptions<Opts, Cfg extends ModalConfig> = Opts extends undefined ? {
  opts?: undefined
  onSubmit?: (data: CreateModalReturnType<Cfg>, i: ModalSubmitInteraction) => void
  onTimeout?: () => void
  time?: number
} : {
  opts: Opts
  onSubmit?: (data: CreateModalReturnType<Cfg>, i: ModalSubmitInteraction) => void
  onTimeout?: () => void
  time?: number
}


export interface Modal<Cfg extends ModalConfig, Opts = undefined> {
  show(
    i: ModalCapableInteraction,
    options: ModalShowOptions<Opts, Cfg>,
  ): Promise<void>;
}

export function createModal<Cfg extends ModalConfig, Opts = undefined>(modalConfig: Cfg): Modal<Cfg, Opts>;
export function createModal<Cfg extends ModalConfig, Opts = undefined>(builder: (opts?: Opts) => Cfg): Modal<Cfg, Opts>;
export function createModal<Cfg extends ModalConfig, Opts = undefined>(builderOrConfig: Cfg | ((opts?: Opts) => Cfg)): Modal<Cfg, Opts> {
  const builder = typeof builderOrConfig === "function" ? builderOrConfig : () => builderOrConfig;

  return {
    async show(i, { opts, onSubmit, onTimeout, time = 60_000 }) {
      const modalConfig = builder(opts)
      const modalId = randomUUIDv7()
      const modal = buildModal(modalId, modalConfig)

      await i.showModal(modal)

      const filter = (i: ModalSubmitInteraction) => i.customId === modalId && i.user.id === i.user.id
      await i
        .awaitModalSubmit({ filter, time })
        .then((i) => onSubmit?.(parseModalData(i, modalConfig), i))
        .catch(() => onTimeout?.())
    },
  }
}

function buildModal(customId: string, modalConfig: ModalConfig): ModalBuilder {
  const modal = new ModalBuilder().setCustomId(customId).setTitle(modalConfig.title)

  for (const [key, field] of Object.entries(modalConfig.fields)) {
    const textInput = new TextInputBuilder()
      .setCustomId(key)
      .setLabel(field.label ?? "")
      .setStyle(field.type ?? TextInputStyle.Short)
      .setRequired(field.required ?? false)
      .setMinLength(field.minLength ?? 0)
      .setMaxLength(field.maxLength ?? 4000)
      .setPlaceholder(field.placeholder ?? "")
      .setValue(field.value ?? "")

    const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(textInput)
    modal.addComponents(actionRow)
  }
  
  return modal
}

function parseModalData<Cfg extends ModalConfig>(i: ModalSubmitInteraction, modalCfg: Cfg): CreateModalReturnType<Cfg> {
  const data = {} as Record<string, string>;

  for (const key in modalCfg.fields) {
    data[key] = i.fields.getTextInputValue(key);
  }

  return data as CreateModalReturnType<Cfg>;
}
