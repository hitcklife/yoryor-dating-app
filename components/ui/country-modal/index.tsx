// import * as React from 'react';
// import { SafeAreaView, StyleSheet, Platform } from 'react-native';
// import { AnimatedModal } from 'react-native-country-picker-modal/lib/AnimatedModal';
// import { Modal } from 'react-native-country-picker-modal/lib/Modal';
// import { useTheme } from 'react-native-country-picker-modal/lib/CountryTheme';
// import { CountryModalContext } from 'react-native-country-picker-modal/lib/CountryModalProvider';
//
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
// });
//
// // Using default parameters instead of defaultProps
// export const CountryModal = ({
//   children,
//   withModal = true,
//   disableNativeModal = false,
//   animationType = 'slide',
//   animated = true,
//   ...props
// }) => {
//   const { backgroundColor } = useTheme();
//   const { teleport } = React.useContext(CountryModalContext);
//
//   const content = (
//     <SafeAreaView style={[styles.container, { backgroundColor }]}>
//       {children}
//     </SafeAreaView>
//   );
//
//   React.useEffect(() => {
//     if (disableNativeModal) {
//       teleport(<AnimatedModal {...props}>{content}</AnimatedModal>);
//     }
//   }, [disableNativeModal]);
//
//   if (withModal) {
//     if (Platform.OS === 'web') {
//       return <Modal {...props}>{content}</Modal>;
//     }
//     if (disableNativeModal) {
//       return null;
//     }
//     return <Modal {...props}>{content}</Modal>;
//   }
//
//   return content;
// };
//
// // No defaultProps here, we're using default parameters in the function signature
