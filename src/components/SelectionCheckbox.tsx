interface SelectionCheckboxProps {
  label: string
  checked: boolean
  onChange: () => void
}

/** 批量管理用的整块可点击复选框，触控目标保持 44px。 */
export default function SelectionCheckbox({
  label,
  checked,
  onChange,
}: SelectionCheckboxProps) {
  return (
    <label className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        className="size-5 accent-blue-600"
      />
    </label>
  )
}
