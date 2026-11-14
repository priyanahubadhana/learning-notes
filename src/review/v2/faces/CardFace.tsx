import { GatedPicture } from '../../../images/RemotePictureCard'
import { isRemoteUrl } from '../../../images/remoteImages'
import { t } from '../../../i18n/t'
import type { CardFace as Face } from '../../../recall/reviewService'
import { faceType, type FaceType } from './faceType'
import { Runs } from './Runs'

function AnswerPicture({ source, depth }: { source: string; depth: number }) {
  const style = { marginInlineStart: depth * 18 }
  return (
    <GatedPicture source={source} cardStyle={{ ...style, marginBottom: 6 }}>
      {(url, onError) => (
        <img
          src={url}
          alt=""
          data-answer-picture
          style={style}
          onError={onError}
          {...(isRemoteUrl(source) ? { referrerPolicy: 'no-referrer' } : {})}
        />
      )}
    </GatedPicture>
  )
}

function Source({ face, type }: { face: Face; type: FaceType }) {
  return (
    <div className="rv2-src">
      <span>
        {t('review.from', { page: face.pageTitle || t('review.untitled') })}
      </span>
      <span className="rv2-pill" data-testid="rv2-type">
        {t(`rv2.cardType.${type}`)}
      </span>
    </div>
  )
}

/**
 * The flip card. The answer side exists only once the card is turned over
 * (nothing to read early, nothing for a screen reader to find). A new card
 * mounts fresh (key = card id), so it never flips back in front of you.
 */
export function CardFace({
  face,
  revealed,
}: {
  face: Face
  revealed: boolean
}) {
  const type = faceType(face)
  return (
    <div className="rv2-flip" data-testid="rv2-card" data-type={type}>
      <div className={`rv2-fc${revealed ? ' is-rev' : ''}`}>
        <article
          className="rv2-face"
          aria-hidden={revealed || undefined}
          aria-label={t('rv2.cardLabel')}
          data-side="front"
        >
          <Source face={face} type={type} />
          <p className="rv2-q">
            <Runs runs={face.text} hiddenBlank={face.blankId} />
          </p>
        </article>
        {revealed && (
          <article className="rv2-face rv2-face--back" data-side="back">
            <Source face={face} type={type} />
            {face.kind === 'blank' ? (
              <p className="rv2-q">
                <Runs runs={face.text} shownBlank={face.blankId} />
              </p>
            ) : (
              <>
                <p className="rv2-q rv2-q--sm">
                  <Runs runs={face.text} />
                </p>
                {face.answer.length === 0 ? (
                  <p className="rv2-a">{t('review.noAnswer')}</p>
                ) : (
                  <div className="rv2-a">
                    {face.answer.map((b) =>
                      b.image ? (
                        <AnswerPicture
                          key={b.id}
                          source={b.image}
                          depth={b.depth}
                        />
                      ) : (
                        <p
                          key={b.id}
                          style={{ paddingInlineStart: b.depth * 18 }}
                          className="rv2-a"
                        >
                          <Runs runs={b.text} />
                        </p>
                      ),
                    )}
                  </div>
                )}
              </>
            )}
          </article>
        )}
      </div>
    </div>
  )
}
