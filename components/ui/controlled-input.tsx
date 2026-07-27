import React from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';

interface ControlledInputProps extends TextInputProps {
  // Puedes añadir props extra si es necesario
}

export const ControlledInput: React.FC<ControlledInputProps> = (props) => {
  return (
    <TextInput
      {...props}
      selectTextOnFocus={props.selectTextOnFocus !== undefined ? props.selectTextOnFocus : true}
      contextMenuHidden={false}
      // Aseguramos que el cursor sea visible y las acciones del sistema no estén bloqueadas
      style={[styles.baseInput, props.style]}
    />
  );
};

const styles = StyleSheet.create({
  baseInput: {
    // Estilos base si fueran necesarios para todos los inputs
  },
});
