---
title: "UI-компоненты пакета @video-chat/ui"
summary: "Обзор общей библиотеки компонентов shadcn/Radix, доступной обоим клиентским приложениям."
updated: 2025-03-17
owners: ["gpt-5-codex"]
tags: ["ui", "design-system"]
related: []
---

## Общие принципы

- Пакет `@video-chat/ui` реэкспортирует все готовые элементы, поэтому внутри приложений достаточно импортировать нужный компонент из корня библиотеки без знания внутренних путей. 【F:packages/ui/src/index.ts†L1-L36】
- Утилита `cn` объединяет className через `clsx` и `tailwind-merge`, что позволяет безопасно наращивать стили поверх преднастроенных классов. 【F:packages/ui/src/lib/utils.ts†L1-L6】
- Хук `useIsMobile` определяет мобильную ширину в рантайме и используется там, где компоненты должны переключаться на мобильное поведение (например, сайдбар). 【F:packages/ui/src/hooks/use-mobile.ts†L3-L18】
- Компоненты придерживаются соглашения `data-slot`, облегчая таргетинг в Tailwind и тестах; все элементы поддерживают дополнительный `className` для кастомизации. 【F:packages/ui/src/components/button.tsx†L39-L56】【F:packages/ui/src/components/card.tsx†L5-L79】

## Компоненты ввода

### Button и ButtonGroup

- `Button` использует `class-variance-authority` для вариантов (`variant`, `size`) и поддерживает `asChild`, что позволяет оборачивать произвольные элементы в кнопку с готовыми стилями. 【F:packages/ui/src/components/button.tsx†L7-L58】
- `ButtonGroup` управляет ориентацией, выравниванием и разделителями, а также умеет встраивать текстовые вставки через `ButtonGroupText` и `ButtonGroupSeparator`, что полезно для составных тулбаров. 【F:packages/ui/src/components/button-group.tsx†L7-L82】

### Input и Textarea

- `Input` переопределяет стандартные стили и состояния (`focus-visible`, `aria-invalid`, `disabled`), сохраняя поддержку типовых HTML-атрибутов. 【F:packages/ui/src/components/input.tsx†L5-L17】
- `Textarea` оформлена схожим образом, добавляя управление высотой и фокусными кольцами; подходит для многострочного ввода без дополнительной обертки. 【F:packages/ui/src/components/textarea.tsx†L5-L15】

### InputGroup

- `InputGroup` и сопутствующие вставки (`Addon`, `Button`, `Text`, `Input`, `Textarea`) позволяют собирать сложные поля с иконками, кнопками или префиксами; компонент управляет выравниванием, фокусами и ошибками на уровне контейнера. 【F:packages/ui/src/components/input-group.tsx†L11-L170】

### Checkbox и RadioGroup

- `Checkbox` построен на Radix и включает индикатор с иконкой `CheckIcon`, наследуя доступность и состояния (`aria-invalid`, `disabled`). 【F:packages/ui/src/components/checkbox.tsx†L9-L28】
- `RadioGroup` и `RadioGroupItem` обеспечивают консистентный сетап радиокнопок с кастомным индикатором круга и сеткой расположения. 【F:packages/ui/src/components/radio-group.tsx†L9-L43】

### Switch

- `Switch` переопределяет Radix `Thumb`, добавляя цветовые состояния и поддержку aria-флагов; элемент рассчитан на использование в формах и настройках. 【F:packages/ui/src/components/switch.tsx†L8-L27】

### Toggle и ToggleGroup

- `Toggle` предоставляет кнопочное состояние `on/off` с вариантами (`default`, `outline`) и размерами, что удобно для форматтеров и фильтров. 【F:packages/ui/src/components/toggle.tsx†L9-L47】
- `ToggleGroup` делится контекстом с `ToggleGroupItem`, чтобы синхронизировать размер и вариант между несколькими переключателями, и автоматически снимает скругления между соседями. 【F:packages/ui/src/components/toggle-group.tsx†L10-L73】

### Field и Label

- Семейство `Field*` (включая `Field`, `FieldSet`, `FieldLegend`, `FieldError` и др.) упорядочивает подписи, описания, ошибки и содержимое поля, поддерживая ориентации (`vertical`, `horizontal`, `responsive`) и автонастройку отступов. 【F:packages/ui/src/components/field.tsx†L10-L244】
- Отдельный `Label` сохраняет доступность Radix и синхронизацию с состояниями формы, включая поддержку `peer-disabled`. 【F:packages/ui/src/components/label.tsx†L8-L20】

### Kbd

- `Kbd` и `KbdGroup` рендерят клавиатурные сочетания, автоматически настраивают размеры и хорошо сочетаются с тултипами (в том числе в `TooltipContent`). 【F:packages/ui/src/components/kbd.tsx†L3-L28】

## Макеты и списки

### Card

- `Card` предоставляет базовый контейнер с шапкой, футером, описанием и блоком действий, что упрощает сборку карточных представлений. 【F:packages/ui/src/components/card.tsx†L5-L92】

### Item

- `Item` и его подсекции (`Media`, `Content`, `Header`, `Footer`, `Actions`) поддерживают варианты (`default`, `outline`, `muted`) и размеры, что удобно для списков с медиа или действиями. 【F:packages/ui/src/components/item.tsx†L8-L193】

### Table

- Набор `Table*` оборачивает HTML-таблицу в прокручиваемый контейнер и задает согласованные стили для заголовков, ячеек и строк, сохраняя семантику. 【F:packages/ui/src/components/table.tsx†L7-L88】

### Separator

- `Separator` обеспечивает горизонтальные и вертикальные разделители с управлением ориентацией и декоративностью, используется другими компонентами (например, `Item`, `ButtonGroup`). 【F:packages/ui/src/components/separator.tsx†L8-L25】

## Навигация и компоновка

### Accordion

- `Accordion` оборачивает Radix-аккордеон и добавляет триггер с иконкой `ChevronDown`, а также анимации для содержимого. 【F:packages/ui/src/components/accordion.tsx†L9-L63】

### Tabs

- `Tabs`, `TabsList`, `TabsTrigger` и `TabsContent` реализуют табы с подчерком активного состояния и поддержкой фокуса; триггеры можно дополнительно стилизовать через `className`. 【F:packages/ui/src/components/tabs.tsx†L8-L64】

### Pagination

- `Pagination` формирует доступную навигацию по страницам: ссылки используют `buttonVariants`, а `PaginationPrevious/Next` добавляют адаптивные подписи и иконки. 【F:packages/ui/src/components/pagination.tsx†L11-L127】

### Menubar

- `Menubar` и обширный набор дочерних элементов (меню, чекбоксы, радио, подписи, шорткаты) повторяют поведение системных меню и работают как на hover, так и на клавиатуре. 【F:packages/ui/src/components/menubar.tsx†L9-L240】

### Sidebar

- `SidebarProvider` хранит состояние (в том числе в cookie), переключает мобильный режим через `Sheet` и предоставляет хук `useSidebar` для вложенных элементов. 【F:packages/ui/src/components/sidebar.tsx†L24-L205】
- Коллекция `Sidebar*` покрывает триггер, рельсу, меню, вложенные элементы, скелетоны и инпут поиска; компоненты автоматически переключаются между полноразмерным и иконковым режимом. 【F:packages/ui/src/components/sidebar.tsx†L208-L725】

## Оверлеи и всплывающие элементы

### AlertDialog

- `AlertDialog` комплектуется оверлеем, содержимым и действиями; `AlertDialogAction/Cancel` используют `buttonVariants`, обеспечивая визуальное соответствие кнопкам. 【F:packages/ui/src/components/alert-dialog.tsx†L9-L157】

### Sheet

- `Sheet` реализует выдвижные панели с поддержкой сторон (`top`, `right`, `bottom`, `left`), а также автоматическое добавление кнопки закрытия и оверлея. 【F:packages/ui/src/components/sheet.tsx†L9-L139】

### Popover и Tooltip

- `Popover` предоставляет портал и контент с анимациями Radix, управляя выравниванием и отступами через пропсы. 【F:packages/ui/src/components/popover.tsx†L8-L40】
- `Tooltip` включает провайдер с настройкой задержки и рисует стрелку, что делает его удобным для клавиатурных подсказок (`Kbd`). 【F:packages/ui/src/components/tooltip.tsx†L8-L55】

### ContextMenu

- `ContextMenu` покрывает все сценарии Radix: вложенные меню, чекбоксы, радиогруппы и шорткаты; удобно комбинировать с `Item` или `Button` как триггером. 【F:packages/ui/src/components/context-menu.tsx†L9-L252】

### Sonner

- `Toaster` оборачивает `sonner`, синхронизируя тему с `next-themes`; компоненты Next.js должны рендерить его один раз на уровне приложения. 【F:packages/ui/src/components/sonner.tsx†L1-L21】

## Обратная связь и статус

### Alert

- `Alert`, `AlertTitle`, `AlertDescription` поддерживают вариант `destructive` и автоматически размещают иконку, если она передана первым дочерним элементом. 【F:packages/ui/src/components/alert.tsx†L6-L64】

### Progress, Skeleton и Spinner

- `Progress` отображает прогресс-бар, рассчитывая смещение индикатора от переданного `value`. 【F:packages/ui/src/components/progress.tsx†L8-L27】
- `Skeleton` — простой пульсирующий плейсхолдер с поддержкой кастомных размеров. 【F:packages/ui/src/components/skeleton.tsx†L3-L10】
- `Spinner` переиспользует иконку `Loader2Icon`, добавляя aria-атрибуты для доступности. 【F:packages/ui/src/components/spinner.tsx†L5-L12】

## Визуализация и данные

### Calendar

- `Calendar` на базе `react-day-picker` переопределяет классы, управляет вариантами кнопок навигации и позволяет заменять части через `components` и `formatters`; `CalendarDayButton` повторно использует `Button` для единообразия. 【F:packages/ui/src/components/calendar.tsx†L14-L213】

### Chart

- `ChartContainer` формирует контекст с конфигом, рендерит `ResponsiveContainer` и генерирует CSS-переменные для тем; `ChartTooltipContent` и `ChartLegendContent` используют конфиг для отображения иконок и подписей. 【F:packages/ui/src/components/chart.tsx†L8-L357】

### Carousel

- `Carousel` строится на Embla, предоставляет контекст с методами `scrollPrev/Next` и кнопки навигации, которые адаптируются к ориентации; `CarouselContent`/`Item` управляют отступами и доступностью. 【F:packages/ui/src/components/carousel.tsx†L17-L240】

## Утилиты и дополнительные элементы

- `Pagination`, `Tabs`, `Menubar` и другие навигационные элементы свободно комбинируются с кнопками и иконками благодаря единым токенам (`buttonVariants`, `data-slot`). 【F:packages/ui/src/components/pagination.tsx†L11-L127】【F:packages/ui/src/components/tabs.tsx†L8-L64】【F:packages/ui/src/components/menubar.tsx†L9-L240】
- `AlertDialog`, `Sheet`, `Sidebar` и `ContextMenu` активно переиспользуют друг друга (например, `Sidebar` вызывает `Sheet` и `Tooltip` в мобильном режиме), поэтому стоит избегать циклических зависимостей и держать бизнес-логику вне компонента. 【F:packages/ui/src/components/sidebar.tsx†L24-L205】【F:packages/ui/src/components/context-menu.tsx†L9-L252】
