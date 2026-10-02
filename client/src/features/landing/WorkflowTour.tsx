import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, JSX, KeyboardEvent } from 'react'
import { ProductPreview, type WorkflowStep } from './ProductPreview'

const steps: WorkflowStep[] = ['report', 'assign', 'complete', 'verify']

const stepLabels: Record<WorkflowStep, string> = {
  report: 'Report',
  assign: 'Assign',
  complete: 'Complete',
  verify: 'Verify',
}

const stepDetails: Record<WorkflowStep, string> = {
  report:
    'A Resident or Administrator records the problem against the right Asset.',
  assign: 'An Administrator makes the next owner explicit for the Society.',
  complete:
    'A Technician submits textual completion proof against the same Ticket.',
  verify:
    'An Administrator accepts or returns the work and preserves the history.',
}

function selectRelativeStep(
  current: WorkflowStep,
  offset: number,
): WorkflowStep {
  const index = steps.indexOf(current)
  return steps[(index + offset + steps.length) % steps.length]!
}

export function WorkflowTour(): JSX.Element {
  const [step, setStep] = useState<WorkflowStep>('report')
  const sequenceRef = useRef<HTMLDivElement>(null)
  const stopPlayback = useRef<() => void>(() => {})
  const tabRefs = useRef<Record<WorkflowStep, HTMLButtonElement | null>>({
    report: null,
    assign: null,
    complete: null,
    verify: null,
  })

  useEffect(() => {
    const sequence = sequenceRef.current
    if (!sequence || typeof window.IntersectionObserver !== 'function') return

    const duration = getComputedStyle(sequence)
      .getPropertyValue('--workflow-step-duration')
      .trim()
    const parsedDuration = Number.parseFloat(duration)
    const delay =
      parsedDuration > 0
        ? parsedDuration * (duration.endsWith('ms') ? 1 : 1000)
        : 1400
    let index = 0
    let visible = false
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined

    function pause(): void {
      clearTimeout(timer)
      timer = undefined
    }

    function schedule(): void {
      if (
        stopped ||
        !visible ||
        document.hidden ||
        timer !== undefined ||
        index === steps.length - 1
      ) {
        return
      }
      timer = setTimeout(() => {
        timer = undefined
        index += 1
        setStep(steps[index]!)
        schedule()
      }, delay)
    }

    stopPlayback.current = () => {
      stopped = true
      pause()
    }
    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries.some(
          (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.2,
        )
        if (visible) schedule()
        else pause()
      },
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' },
    )
    function handleVisibility(): void {
      if (document.hidden) pause()
      else schedule()
    }
    observer.observe(sequence)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      pause()
      observer.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
      stopPlayback.current = () => {}
    }
  }, [])

  function moveToStep(nextStep: WorkflowStep): void {
    setStep(nextStep)
    tabRefs.current[nextStep]?.focus()
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    current: WorkflowStep,
  ): void {
    let nextStep: WorkflowStep | undefined

    if (event.key === 'ArrowRight') {
      nextStep = selectRelativeStep(current, 1)
    } else if (event.key === 'ArrowLeft') {
      nextStep = selectRelativeStep(current, -1)
    } else if (event.key === 'ArrowDown') {
      nextStep = selectRelativeStep(current, 1)
    } else if (event.key === 'ArrowUp') {
      nextStep = selectRelativeStep(current, -1)
    } else if (event.key === 'Home') {
      nextStep = steps[0]!
    } else if (event.key === 'End') {
      nextStep = steps[steps.length - 1]!
    }

    if (nextStep) {
      event.preventDefault()
      moveToStep(nextStep)
    }
  }

  return (
    <div
      className="workflow-tour"
      role="region"
      aria-label="From report to verified repair"
      onFocusCapture={() => stopPlayback.current()}
      onPointerDownCapture={() => stopPlayback.current()}
      style={
        {
          '--workflow-progress': (steps.indexOf(step) + 1) / steps.length,
        } as CSSProperties
      }
    >
      <div
        className="workflow-tabs"
        aria-orientation="vertical"
        role="tablist"
        aria-label="Ticket lifecycle steps"
        data-reveal
        ref={sequenceRef}
      >
        {steps.map((current, index) => (
          <button
            aria-label={stepLabels[current]}
            aria-controls="workflow-panel"
            aria-selected={step === current}
            className="workflow-tab landing-secondary-action"
            id={`workflow-tab-${current}`}
            key={current}
            onClick={() => {
              stopPlayback.current()
              setStep(current)
            }}
            onKeyDown={(event) => handleKeyDown(event, current)}
            ref={(element) => {
              tabRefs.current[current] = element
            }}
            role="tab"
            tabIndex={step === current ? 0 : -1}
            type="button"
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{stepLabels[current]}</strong>
            <span>{stepDetails[current]}</span>
          </button>
        ))}
      </div>
      <div
        aria-labelledby={`workflow-tab-${step}`}
        className="workflow-panel"
        id="workflow-panel"
        role="tabpanel"
        tabIndex={0}
        data-reveal
      >
        <ProductPreview step={step} compact />
      </div>
    </div>
  )
}
