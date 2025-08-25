/**
 * SettingsForm コンポーネント
 * React Hook Form + Zodを使用した統一的な設定フォーム
 */
import React from 'react'
import { useForm, Controller, UseFormReturn, FieldValues, Path } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ZodSchema } from 'zod'
import styles from './SettingsForm.module.css'

interface SettingsFormProps<T extends FieldValues> {
  /** Zodスキーマ */
  schema: ZodSchema<T>
  /** デフォルト値 */
  defaultValues: T
  /** フォーム送信時のコールバック */
  onSubmit: (values: T) => void
  /** フォーム変更時のコールバック（オプション） */
  onChange?: (values: T) => void
  /** フォームのタイトル（オプション） */
  title?: string
  /** フォームの説明（オプション） */
  description?: string
  /** 送信ボタンのテキスト */
  submitText?: string
  /** フォームフィールドの定義 */
  fields: FormField<T>[]
  /** フォームを無効化 */
  disabled?: boolean
  /** リセットボタンを表示 */
  showReset?: boolean
  /** 自動保存（onChange時に即座にonSubmitを呼ぶ） */
  autoSave?: boolean
}

interface FormField<T extends FieldValues> {
  /** フィールド名 */
  name: Path<T>
  /** ラベル */
  label: string
  /** フィールドタイプ */
  type: 'text' | 'number' | 'select' | 'checkbox' | 'radio' | 'range' | 'segment'
  /** 説明文（オプション） */
  description?: string
  /** プレースホルダー（オプション） */
  placeholder?: string
  /** 選択肢（select, radio, segment用） */
  options?: Array<{
    value: string | number
    label: string
    description?: string
  }>
  /** 最小値（number, range用） */
  min?: number
  /** 最大値（number, range用） */
  max?: number
  /** ステップ（number, range用） */
  step?: number
  /** 単位（オプション） */
  unit?: string
  /** 条件付き表示（他のフィールドの値に依存） */
  showIf?: (values: T) => boolean
  /** カスタムレンダリング（オプション） */
  render?: (props: {
    field: any
    fieldState: any
    formState: any
  }) => React.ReactNode
}

export function SettingsForm<T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  onChange,
  title,
  description,
  submitText = '適用',
  fields,
  disabled = false,
  showReset = false,
  autoSave = false,
}: SettingsFormProps<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange',
  })

  const { control, handleSubmit, reset, watch, formState } = form
  const { errors, isDirty, isSubmitting } = formState

  // 全フィールドを監視
  const watchedValues = watch()

  // フォーム変更時の処理
  React.useEffect(() => {
    if (onChange && isDirty) {
      onChange(watchedValues)
      if (autoSave) {
        handleSubmit(onSubmit)()
      }
    }
  }, [watchedValues, isDirty, onChange, autoSave, handleSubmit, onSubmit])

  // フィールドレンダリング
  const renderField = (field: FormField<T>) => {
    // 条件付き表示のチェック
    if (field.showIf && !field.showIf(watchedValues)) {
      return null
    }

    // カスタムレンダリング
    if (field.render) {
      return (
        <Controller
          name={field.name}
          control={control}
          render={field.render}
        />
      )
    }

    return (
      <Controller
        name={field.name}
        control={control}
        render={({ field: controllerField, fieldState }) => {
          const error = fieldState.error

          switch (field.type) {
            case 'text':
              return (
                <div className={styles.field}>
                  <label htmlFor={field.name} className={styles.label}>
                    {field.label}
                    {field.unit && <span className={styles.unit}> ({field.unit})</span>}
                  </label>
                  {field.description && (
                    <p className={styles.description}>{field.description}</p>
                  )}
                  <input
                    {...controllerField}
                    id={field.name}
                    type="text"
                    placeholder={field.placeholder}
                    disabled={disabled}
                    className={`${styles.input} ${error ? styles.error : ''}`}
                  />
                  {error && <span className={styles.errorMessage}>{error.message}</span>}
                </div>
              )

            case 'number':
              return (
                <div className={styles.field}>
                  <label htmlFor={field.name} className={styles.label}>
                    {field.label}
                    {field.unit && <span className={styles.unit}> ({field.unit})</span>}
                  </label>
                  {field.description && (
                    <p className={styles.description}>{field.description}</p>
                  )}
                  <input
                    {...controllerField}
                    id={field.name}
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    placeholder={field.placeholder}
                    disabled={disabled}
                    className={`${styles.input} ${error ? styles.error : ''}`}
                    onChange={(e) => {
                      const value = e.target.value ? parseFloat(e.target.value) : ''
                      controllerField.onChange(value)
                    }}
                  />
                  {error && <span className={styles.errorMessage}>{error.message}</span>}
                </div>
              )

            case 'range':
              return (
                <div className={styles.field}>
                  <label htmlFor={field.name} className={styles.label}>
                    {field.label}: {controllerField.value}
                    {field.unit && <span className={styles.unit}> {field.unit}</span>}
                  </label>
                  {field.description && (
                    <p className={styles.description}>{field.description}</p>
                  )}
                  <div className={styles.rangeContainer}>
                    <span className={styles.rangeMin}>{field.min}</span>
                    <input
                      {...controllerField}
                      id={field.name}
                      type="range"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      disabled={disabled}
                      className={styles.range}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value)
                        controllerField.onChange(value)
                      }}
                    />
                    <span className={styles.rangeMax}>{field.max}</span>
                  </div>
                  {error && <span className={styles.errorMessage}>{error.message}</span>}
                </div>
              )

            case 'select':
              return (
                <div className={styles.field}>
                  <label htmlFor={field.name} className={styles.label}>
                    {field.label}
                  </label>
                  {field.description && (
                    <p className={styles.description}>{field.description}</p>
                  )}
                  <select
                    {...controllerField}
                    id={field.name}
                    disabled={disabled}
                    className={`${styles.select} ${error ? styles.error : ''}`}
                  >
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {error && <span className={styles.errorMessage}>{error.message}</span>}
                </div>
              )

            case 'checkbox':
              return (
                <div className={styles.field}>
                  <label className={styles.checkboxLabel}>
                    <input
                      {...controllerField}
                      type="checkbox"
                      disabled={disabled}
                      className={styles.checkbox}
                      checked={controllerField.value}
                    />
                    <span>{field.label}</span>
                  </label>
                  {field.description && (
                    <p className={styles.description}>{field.description}</p>
                  )}
                  {error && <span className={styles.errorMessage}>{error.message}</span>}
                </div>
              )

            case 'radio':
              return (
                <div className={styles.field}>
                  <fieldset>
                    <legend className={styles.label}>{field.label}</legend>
                    {field.description && (
                      <p className={styles.description}>{field.description}</p>
                    )}
                    <div className={styles.radioGroup}>
                      {field.options?.map((option) => (
                        <label key={option.value} className={styles.radioLabel}>
                          <input
                            type="radio"
                            value={option.value}
                            checked={controllerField.value === option.value}
                            onChange={() => controllerField.onChange(option.value)}
                            disabled={disabled}
                            className={styles.radio}
                          />
                          <span>{option.label}</span>
                          {option.description && (
                            <small className={styles.optionDescription}>
                              {option.description}
                            </small>
                          )}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {error && <span className={styles.errorMessage}>{error.message}</span>}
                </div>
              )

            case 'segment':
              return (
                <div className={styles.field}>
                  <label className={styles.label}>{field.label}</label>
                  {field.description && (
                    <p className={styles.description}>{field.description}</p>
                  )}
                  <div className={styles.segmentControl}>
                    {field.options?.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => controllerField.onChange(option.value)}
                        disabled={disabled}
                        className={`${styles.segmentButton} ${
                          controllerField.value === option.value ? styles.active : ''
                        }`}
                        title={option.description}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {error && <span className={styles.errorMessage}>{error.message}</span>}
                </div>
              )

            default:
              return null
          }
        }}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      {title && <h3 className={styles.title}>{title}</h3>}
      {description && <p className={styles.formDescription}>{description}</p>}

      <div className={styles.fields}>
        {fields.map((field) => (
          <div key={field.name}>{renderField(field)}</div>
        ))}
      </div>

      <div className={styles.actions}>
        {!autoSave && (
          <button
            type="submit"
            disabled={disabled || isSubmitting || !isDirty}
            className={styles.submitButton}
          >
            {isSubmitting ? '処理中...' : submitText}
          </button>
        )}
        {showReset && (
          <button
            type="button"
            onClick={() => reset(defaultValues)}
            disabled={disabled || !isDirty}
            className={styles.resetButton}
          >
            リセット
          </button>
        )}
      </div>
    </form>
  )
}

// 型安全なヘルパー関数
export function createSettingsForm<T extends FieldValues>() {
  return SettingsForm as React.FC<SettingsFormProps<T>>
}