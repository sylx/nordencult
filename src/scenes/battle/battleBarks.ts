import type { BarkSource, BarkSpeaker, ExchangeLine } from '@norden/battle-runtime'
import { pickVoiceLine, type VoiceProfile } from '../../data/voiceLines'

/** Lines of a situation of norden-battle in voiceLines.json */
const situationId = (situation: string) => `battle.${situation}`

/** How many of the joining allies answer in a combined attack exchange */
const MAX_REPLIES = 2

/**
 * What units say in battle (norden-battle's BarkSource), picked from voiceLines.json by the
 * voice tone and personality of the knight commanding each unit (profileOf; undefined: the
 * common lines). An exchange is the attacker's call followed by the joining allies' replies.
 */
export function createVoiceBarks(profileOf: (speaker: BarkSpeaker) => VoiceProfile | undefined): BarkSource {
  return {
    line: (situation, speaker) => pickVoiceLine(situationId(situation), profileOf(speaker)),
    exchange: (members) => {
      const lead = pickVoiceLine(situationId('exchange_lead'), profileOf(members[0]))
      if (!lead) return null
      const lines: ExchangeLine[] = [{ who: 0, text: lead }]
      members.slice(1, 1 + MAX_REPLIES).forEach((m, i) => {
        const reply = pickVoiceLine(situationId('exchange_reply'), profileOf(m))
        if (reply && !lines.some((l) => l.text === reply)) lines.push({ who: i + 1, text: reply })
      })
      return lines.length >= 2 ? lines : null
    },
  }
}
