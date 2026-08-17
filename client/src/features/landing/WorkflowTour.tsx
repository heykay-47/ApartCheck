import { useRef, useState } from 'react'
import type { JSX, KeyboardEvent } from 'react'
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
  const tabRefs = useRef<Record<WorkflowStep, HTMLButtonElement | null>>({
    report: null,
    assign: null,
    complete: null,
    verify: null,
  })

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
    >
      <div
        className="workflow-tabs"
        aria-orientation="vertical"
        role="tablist"
        aria-label="Ticket lifecycle steps"
      >
        {steps.map((current, index) => (
          <button
            aria-label={stepLabels[current]}
            aria-controls="workflow-panel"
            aria-selected={step === current}
            className="workflow-tab landing-secondary-action"
            id={`workflow-tab-${current}`}
            key={current}
            onClick={() => setStep(current)}
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
      >
        <ProductPreview step={step} compact />
      </div>
    </div>
  )
}
