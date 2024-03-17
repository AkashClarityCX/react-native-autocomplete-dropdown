import debounce from 'lodash.debounce'
import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import {
  Dimensions,
  Keyboard,
  ListRenderItem,
  NativeSyntheticEvent,
  TextInput,
  TextInputFocusEventData,
  TextInputSubmitEditingEventData,
  TouchableOpacity,
  View
} from 'react-native'
import { Dropdown } from './Dropdown'
import { moderateScale, ScaledSheet } from 'react-native-size-matters'
import { NothingFound } from './NothingFound'
import { RightButton } from './RightButton'
import { ScrollViewListItem } from './ScrollViewListItem'
import { useContext } from 'react'
import {
  AutocompleteDropdownContext,
  AutocompleteDropdownContextProvider
} from './AutocompleteDropdownContext'
import { useKeyboardHeight } from './useKeyboardHeight'
import diacriticless from './diacriticless'
import type { IAutocompleteDropdownProps, AutocompleteDropdownItem } from './index.d'

export { AutocompleteDropdownContextProvider }

export const AutocompleteDropdown = memo(
  forwardRef((props: IAutocompleteDropdownProps, ref) => {
    const {
      dataSet: dataSetProp,
      initialValue: initialValueProp,
      clearOnFocus = true,
      ignoreAccents = true,
      trimSearchText = true,
      matchFrom,
      inputHeight = moderateScale(40, 0.2),
      suggestionsListMaxHeight = moderateScale(200, 0.2),
      // bottomOffset = 0,
      direction: directionProp,
      controller,
      onSelectItem: onSelectItemProp,
      onOpenSuggestionsList,
      useFilter,
      renderItem: customRenderItem,
      EmptyResultComponent,
      emptyResultText,
      onClear,
      onChangeText: onTextChange,
      debounce: debounceDelay,
      onChevronPress: onChevronPressProp,
      onFocus: onFocusProp,
      onBlur: onBlurProp,
      onSubmit: onSubmitProp,
      closeOnSubmit,
      loading,
      LeftComponent,
      textInputProps,
      showChevron,
      showClear,
      rightButtonsContainerStyle,
      ChevronIconComponent,
      ClearIconComponent,
      RightIconComponent,
      onRightIconComponentPress,
      containerStyle,
      inputContainerStyle,
      suggestionsListTextStyle
    } = props
    const InputComponent = (props.InputComponent as typeof TextInput) || TextInput
    const inputRef = useRef<TextInput>(null)
    const containerRef = useRef<View>(null)
    const [searchText, setSearchText] = useState('')
    const [inputValue, setInputValue] = useState('')
    const [selectedItem, setSelectedItem] = useState<AutocompleteDropdownItem | null>(null)
    const [isOpened, setIsOpened] = useState(false)
    const initialDataSetRef = useRef<AutocompleteDropdownItem[] | undefined | null>(dataSetProp)
    const initialValueRef = useRef(initialValueProp)
    const [dataSet, setDataSet] = useState(dataSetProp)
    const matchFromStart = matchFrom === 'start' ? true : false
    const kbHeight = useKeyboardHeight()
    const {
      content,
      setContent,
      activeInputRef,
      controllerRef,
      direction = directionProp,
      setDirection
    } = useContext(AutocompleteDropdownContext)

    const calculateDirection = useCallback(async () => {
      const [, positionY] = await new Promise<[x: number, y: number, width: number, height: number]>(
        resolve =>
          containerRef.current?.measureInWindow((...rect) => {
            resolve(rect)
          })
      )

      const screenHeight = Dimensions.get('window').height
      setDirection((screenHeight - kbHeight) / 2 > positionY ? 'down' : 'up')
      return new Promise<void>(resolve => {
        setTimeout(() => {
          return resolve()
        }, 1)
      })
    }, [kbHeight, setDirection])

    const onClearPress = useCallback(() => {
      setSearchText('')
      setInputValue('')
      setSelectedItem(null)
      setIsOpened(false)
      inputRef.current?.blur()
      if (typeof onClear === 'function') {
        onClear()
      }
    }, [onClear])

    /** methods */
    const close = useCallback(() => {
      setIsOpened(false)
      setContent(undefined)
    }, [setContent])

    const blur = useCallback(() => {
      inputRef.current?.blur()
    }, [])

    // useEffect(() => {
    //   if (kbHeight && !direction) {
    //     calculateDirection()
    //   }
    // }, [kbHeight, direction])

    const open = useCallback(async () => {
      if (directionProp) {
        setDirection(directionProp)
      } else {
        await calculateDirection()
      }

      setTimeout(() => {
        setIsOpened(true)
      }, 0)
    }, [calculateDirection, directionProp, setDirection])

    const toggle = useCallback(() => {
      isOpened ? close() : open()
    }, [close, isOpened, open])

    const clear = useCallback(() => {
      onClearPress()
    }, [onClearPress])

    useLayoutEffect(() => {
      if (ref) {
        if (typeof ref === 'function') {
          ref(inputRef.current)
        } else {
          ref.current = inputRef.current
        }
      }
    }, [inputRef, ref])

    /** Set initial value */
    useEffect(() => {
      const initialDataSet = initialDataSetRef.current
      const initialValue = initialValueRef.current
      if (!Array.isArray(initialDataSet)) {
        // nothing to set or already setted
        return
      }

      let dataSetItem: AutocompleteDropdownItem | undefined
      if (typeof initialValue === 'string') {
        dataSetItem = initialDataSet.find(el => el.id === initialValue)
      } else if (typeof initialValue === 'object' && initialValue.id) {
        dataSetItem = initialDataSet.find(el => el.id === initialValue?.id)
      }

      if (dataSetItem) {
        setSelectedItem(dataSetItem)
      }
    }, [])

    const setInputText = useCallback((text: string) => {
      setSearchText(text)
    }, [])

    const setItem = useCallback((item: AutocompleteDropdownItem | null) => {
      setSelectedItem(item)
    }, [])

    /** expose controller methods */
    useEffect(() => {
      if (typeof controller === 'function') {
        controller({ close, blur, open, toggle, clear, setInputText, setItem })
      }
      if (controllerRef) {
        controllerRef.current = { close, blur, open, toggle, clear, setInputText, setItem }
      }
    }, [blur, clear, close, controller, controllerRef, open, setInputText, setItem, toggle])

    useEffect(() => {
      if (selectedItem) {
        setInputValue(selectedItem.title ?? '')
      } else {
        setInputValue('')
      }
    }, [selectedItem])

    useEffect(() => {
      setInputValue(searchText)
    }, [searchText])

    useEffect(() => {
      if (typeof onSelectItemProp === 'function') {
        onSelectItemProp(selectedItem)
      }
    }, [onSelectItemProp, selectedItem])

    useEffect(() => {
      if (typeof onOpenSuggestionsList === 'function') {
        onOpenSuggestionsList(isOpened)
      }
    }, [isOpened, onOpenSuggestionsList])

    useEffect(() => {
      // renew state on close
      if (!isOpened && selectedItem && !loading) {
        setInputValue(selectedItem.title || '')
      } else {
        setInputValue(searchText || '')
      }
    }, [isOpened, loading, searchText, selectedItem])

    const _onSelectItem = useCallback((item: AutocompleteDropdownItem) => {
      setSelectedItem(item)
      inputRef.current?.blur()
      setIsOpened(false)
    }, [])

    useEffect(() => {
      initialDataSetRef.current = dataSetProp
      setDataSet(dataSetProp)
    }, [dataSetProp])

    useEffect(() => {
      const initialDataSet = initialDataSetRef.current
      if (!searchText?.length) {
        setDataSet(initialDataSet)
        return
      }

      if (!Array.isArray(initialDataSet) || useFilter === false) {
        return
      }

      let findWhat = searchText.toLowerCase()

      if (ignoreAccents) {
        findWhat = diacriticless(findWhat)
      }

      if (trimSearchText) {
        findWhat = findWhat.trim()
      }

      const newSet = initialDataSet.filter(item => {
        const titleLowercase = (item.title || '').toLowerCase()
        const findWhere = ignoreAccents ? diacriticless(titleLowercase) : titleLowercase.toLowerCase()

        if (matchFromStart) {
          return typeof item.title === 'string' && findWhere.startsWith(findWhat)
        } else {
          return typeof item.title === 'string' && findWhere.indexOf(findWhat) !== -1
        }
      })

      setDataSet(newSet)
    }, [ignoreAccents, matchFromStart, searchText, trimSearchText, useFilter])

    const renderItem: ListRenderItem<AutocompleteDropdownItem> = useCallback(
      ({ item }) => {
        if (typeof customRenderItem === 'function') {
          const EL = customRenderItem(item, searchText)
          return <TouchableOpacity onPress={() => _onSelectItem(item)}>{EL}</TouchableOpacity>
        }

        return (
          <ScrollViewListItem
            key={item.id}
            title={item.title || ''}
            highlight={searchText}
            style={suggestionsListTextStyle}
            onPress={() => _onSelectItem(item)}
            ignoreAccents={ignoreAccents}
          />
        )
      },
      [_onSelectItem, customRenderItem, ignoreAccents, searchText, suggestionsListTextStyle]
    )

    const ListEmptyComponent = useMemo(() => {
      return EmptyResultComponent ?? <NothingFound emptyResultText={emptyResultText} />
    }, [EmptyResultComponent, emptyResultText])

    const debouncedEvent = useCallback(
      debounce((text: string) => {
        if (typeof onTextChange === 'function') {
          onTextChange(text)
        }
      }, debounceDelay ?? 0),
      [onTextChange]
    )

    const onChangeText = useCallback(
      (text: string) => {
        setSearchText(text)
        debouncedEvent(text)
      },
      [debouncedEvent]
    )

    const onChevronPress = useCallback(() => {
      toggle()
      Keyboard.dismiss()

      if (typeof onChevronPressProp === 'function') {
        onChevronPressProp()
      }
    }, [onChevronPressProp, toggle])

    const onFocus = useCallback(
      (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        if (clearOnFocus) {
          setSearchText('')
          setInputValue('')
        }
        if (typeof onFocusProp === 'function') {
          onFocusProp(e)
        }
        open()
      },
      [clearOnFocus, onFocusProp, open]
    )

    const onBlur = useCallback(
      (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        if (typeof onBlurProp === 'function') {
          onBlurProp(e)
        }
      },
      [onBlurProp]
    )

    const onSubmit = useCallback(
      (e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
        inputRef.current?.blur()
        if (closeOnSubmit) {
          close()
        }

        if (typeof onSubmitProp === 'function') {
          onSubmitProp(e)
        }
      },
      [close, closeOnSubmit, onSubmitProp]
    )

    useEffect(() => {
      if (!content && !inputRef.current?.isFocused()) {
        setIsOpened(false)
      }
    }, [content, searchText])

    useEffect(() => {
      if (searchText && inputRef.current?.isFocused()) {
        setIsOpened(true)
      }
    }, [content, searchText])

    useEffect(() => {
      if (isOpened && Array.isArray(dataSet)) {
        if (activeInputRef) {
          activeInputRef.current = containerRef.current
        }

        setContent(
          <Dropdown
            {...{
              ...props,
              direction,
              inputHeight,
              dataSet,
              suggestionsListMaxHeight,
              renderItem,
              ListEmptyComponent
            }}
          />
        )
      } else {
        setContent(undefined)
      }
    }, [
      ListEmptyComponent,
      activeInputRef,
      dataSet,
      direction,
      inputHeight,
      isOpened,
      props,
      renderItem,
      setContent,
      suggestionsListMaxHeight
    ])

    return (
      <View
        onStartShouldSetResponder={() => true}
        onTouchEnd={e => {
          e.stopPropagation()
        }}
        style={[styles.container, containerStyle]}>
        <View
          ref={containerRef}
          onLayout={_ => {}} // it's necessary use onLayout here for Androd (bug?)
          style={[styles.inputContainerStyle, inputContainerStyle]}>
          {LeftComponent}
          <InputComponent
            ref={inputRef}
            value={inputValue}
            onChangeText={onChangeText}
            autoCorrect={false}
            onBlur={onBlur}
            onFocus={onFocus}
            onSubmitEditing={onSubmit}
            placeholderTextColor="#d0d4dc"
            {...textInputProps}
            style={[styles.Input, { height: inputHeight }, (textInputProps ?? {}).style]}
          />
          <RightButton
            isOpened={isOpened}
            inputHeight={inputHeight}
            onClearPress={onClearPress}
            onChevronPress={onChevronPress}
            showChevron={showChevron ?? true}
            showClear={showClear ?? !!searchText}
            loading={loading}
            buttonsContainerStyle={rightButtonsContainerStyle}
            ChevronIconComponent={ChevronIconComponent}
            ClearIconComponent={ClearIconComponent}
            RightIconComponent={RightIconComponent}
            onRightIconComponentPress={onRightIconComponentPress}
          />
        </View>
      </View>
    )
  })
)

const styles = ScaledSheet.create({
  container: {
    marginVertical: 2
  },
  inputContainerStyle: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#e5ecf2',
    borderRadius: 5
  },
  Input: {
    flexGrow: 1,
    flexShrink: 1,
    overflow: 'hidden',
    paddingHorizontal: 13,
    fontSize: 16
  }
})
