import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { z } from 'zod'
import { SettingsForm } from '../SettingsForm'

const testSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  age: z.number().min(0).max(120),
  email: z.string().email('Invalid email'),
  agree: z.boolean(),
  preference: z.enum(['option1', 'option2', 'option3']),
})

type TestFormData = z.infer<typeof testSchema>

describe('SettingsForm', () => {
  const user = userEvent.setup()

  const defaultValues: TestFormData = {
    name: '',
    age: 25,
    email: '',
    agree: false,
    preference: 'option1',
  }

  it('renders form with title and description', () => {
    render(
      <SettingsForm
        schema={testSchema}
        defaultValues={defaultValues}
        onSubmit={vi.fn()}
        title="Test Form"
        description="This is a test form"
        fields={[]}
      />
    )

    expect(screen.getByText('Test Form')).toBeInTheDocument()
    expect(screen.getByText('This is a test form')).toBeInTheDocument()
  })

  it('renders text input field', () => {
    render(
      <SettingsForm
        schema={testSchema}
        defaultValues={defaultValues}
        onSubmit={vi.fn()}
        fields={[
          {
            name: 'name',
            label: 'Name',
            type: 'text',
            placeholder: 'Enter your name',
          },
        ]}
      />
    )

    const input = screen.getByLabelText('Name')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveAttribute('placeholder', 'Enter your name')
  })

  it('renders number input field', () => {
    render(
      <SettingsForm
        schema={testSchema}
        defaultValues={defaultValues}
        onSubmit={vi.fn()}
        fields={[
          {
            name: 'age',
            label: 'Age',
            type: 'number',
            min: 0,
            max: 120,
            step: 1,
          },
        ]}
      />
    )

    const input = screen.getByLabelText('Age')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'number')
    expect(input).toHaveAttribute('min', '0')
    expect(input).toHaveAttribute('max', '120')
  })

  it('renders select field', () => {
    render(
      <SettingsForm
        schema={testSchema}
        defaultValues={defaultValues}
        onSubmit={vi.fn()}
        fields={[
          {
            name: 'preference',
            label: 'Preference',
            type: 'select',
            options: [
              { value: 'option1', label: 'Option 1' },
              { value: 'option2', label: 'Option 2' },
              { value: 'option3', label: 'Option 3' },
            ],
          },
        ]}
      />
    )

    const select = screen.getByLabelText('Preference')
    expect(select).toBeInTheDocument()
    expect(screen.getByText('Option 1')).toBeInTheDocument()
  })

  it('renders checkbox field', () => {
    render(
      <SettingsForm
        schema={testSchema}
        defaultValues={defaultValues}
        onSubmit={vi.fn()}
        fields={[
          {
            name: 'agree',
            label: 'I agree to terms',
            type: 'checkbox',
          },
        ]}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeInTheDocument()
    expect(screen.getByText('I agree to terms')).toBeInTheDocument()
  })

  it('renders range input field', () => {
    render(
      <SettingsForm
        schema={testSchema}
        defaultValues={defaultValues}
        onSubmit={vi.fn()}
        fields={[
          {
            name: 'age',
            label: 'Age',
            type: 'range',
            min: 0,
            max: 120,
            step: 1,
          },
        ]}
      />
    )

    const range = screen.getByRole('slider')
    expect(range).toBeInTheDocument()
    expect(range).toHaveAttribute('type', 'range')
    expect(range).toHaveAttribute('min', '0')
    expect(range).toHaveAttribute('max', '120')
  })

  it('renders segment control field', () => {
    render(
      <SettingsForm
        schema={testSchema}
        defaultValues={defaultValues}
        onSubmit={vi.fn()}
        fields={[
          {
            name: 'preference',
            label: 'Choose Option',
            type: 'segment',
            options: [
              { value: 'option1', label: 'One' },
              { value: 'option2', label: 'Two' },
              { value: 'option3', label: 'Three' },
            ],
          },
        ]}
      />
    )

    expect(screen.getByText('Choose Option')).toBeInTheDocument()
    expect(screen.getByText('One')).toBeInTheDocument()
    expect(screen.getByText('Two')).toBeInTheDocument()
    expect(screen.getByText('Three')).toBeInTheDocument()
  })

  it('calls onSubmit with form data', async () => {
    const onSubmit = vi.fn()
    
    render(
      <SettingsForm
        schema={testSchema}
        defaultValues={defaultValues}
        onSubmit={onSubmit}
        fields={[
          {
            name: 'name',
            label: 'Name',
            type: 'text',
          },
          {
            name: 'email',
            label: 'Email',
            type: 'text',
          },
        ]}
      />
    )

    const nameInput = screen.getByLabelText('Name')
    const emailInput = screen.getByLabelText('Email')
    
    await user.type(nameInput, 'John Doe')
    await user.type(emailInput, 'john@example.com')
    
    const submitButton = screen.getByText('適用')
    await user.click(submitButton)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          email: 'john@example.com',
        })
      )
    })
  })

  it('shows validation errors', async () => {
    render(
      <SettingsForm
        schema={testSchema}
        defaultValues={defaultValues}
        onSubmit={vi.fn()}
        fields={[
          {
            name: 'email',
            label: 'Email',
            type: 'text',
          },
        ]}
      />
    )

    const emailInput = screen.getByLabelText('Email')
    await user.type(emailInput, 'invalid-email')
    
    const submitButton = screen.getByText('適用')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid email')).toBeInTheDocument()
    })
  })

  it('disables form when disabled prop is true', () => {
    render(
      <SettingsForm
        schema={testSchema}
        defaultValues={defaultValues}
        onSubmit={vi.fn()}
        disabled
        fields={[
          {
            name: 'name',
            label: 'Name',
            type: 'text',
          },
        ]}
      />
    )

    const input = screen.getByLabelText('Name')
    expect(input).toBeDisabled()
    
    const submitButton = screen.getByText('適用')
    expect(submitButton).toBeDisabled()
  })

  it('shows reset button when showReset is true', async () => {
    render(
      <SettingsForm
        schema={testSchema}
        defaultValues={defaultValues}
        onSubmit={vi.fn()}
        showReset
        fields={[
          {
            name: 'name',
            label: 'Name',
            type: 'text',
          },
        ]}
      />
    )

    const input = screen.getByLabelText('Name')
    await user.type(input, 'New Value')
    
    const resetButton = screen.getByText('リセット')
    expect(resetButton).toBeInTheDocument()
    
    await user.click(resetButton)
    expect(input).toHaveValue('')
  })

  it('calls onChange when form values change', async () => {
    const onChange = vi.fn()
    
    render(
      <SettingsForm
        schema={testSchema}
        defaultValues={defaultValues}
        onSubmit={vi.fn()}
        onChange={onChange}
        fields={[
          {
            name: 'name',
            label: 'Name',
            type: 'text',
          },
        ]}
      />
    )

    const input = screen.getByLabelText('Name')
    await user.type(input, 'Test')

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled()
    })
  })

  it('auto-saves when autoSave is true', async () => {
    const onSubmit = vi.fn()
    
    render(
      <SettingsForm
        schema={testSchema}
        defaultValues={defaultValues}
        onSubmit={onSubmit}
        autoSave
        fields={[
          {
            name: 'name',
            label: 'Name',
            type: 'text',
          },
        ]}
      />
    )

    const input = screen.getByLabelText('Name')
    await user.type(input, 'Auto Save Test')

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })
  })

  it('conditionally shows fields based on showIf', () => {
    const { rerender } = render(
      <SettingsForm
        schema={testSchema}
        defaultValues={{ ...defaultValues, agree: false }}
        onSubmit={vi.fn()}
        fields={[
          {
            name: 'agree',
            label: 'Show more options',
            type: 'checkbox',
          },
          {
            name: 'email',
            label: 'Email',
            type: 'text',
            showIf: (values) => values.agree === true,
          },
        ]}
      />
    )

    // Email field should not be visible initially
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()

    // Check the checkbox
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    // Rerender with updated values
    rerender(
      <SettingsForm
        schema={testSchema}
        defaultValues={{ ...defaultValues, agree: true }}
        onSubmit={vi.fn()}
        fields={[
          {
            name: 'agree',
            label: 'Show more options',
            type: 'checkbox',
          },
          {
            name: 'email',
            label: 'Email',
            type: 'text',
            showIf: (values) => values.agree === true,
          },
        ]}
      />
    )

    // Email field should now be visible
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })
})