import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput, Modal, Button, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';



export default function ProfileScreen() {
  const [user, setUser] = useState(({} as User));
  const [editing, setEditing] = useState({ name: false, phone: false, email: false });
  const [modalVisible, setModalVisible] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new1: '', new2: '' });
  const [loading, setLoading] = useState(false);
  const { user: authUser, setUser: setAuthUser } = useAuth();

  const router = useRouter();

  type User = {
    name: string;
    phone: string;
    email: string;
    password: string;
    photo: string;
  };


  useEffect(() => {
    setLoading(true);
    fetch('https://getuser-wxmeentkrq-uc.a.run.app', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: authUser?.email,
        password: authUser?.password
      }),
    })
      .then(response => response.json())
      .then(data => {
        const adapted = data.map((user: User) => ({
          name: user.name || '',
          phone: user.phone || '',
          email: user.email || '',
          photo: user.photo || ''
        }));
        setUser(adapted[0]);

      })
      .catch(error => console.error(error))
      .finally(() => setLoading(false));
  }, []);

  // Troca de imagem
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets[0].uri) {
      setUser({ ...user, photo: result.assets[0].uri });
    }
  };

  // Troca de senha mockada
  const handleChangePassword = async () => {
    setLoading(true);
    if (passwords.new1 === passwords.new2 && passwords.current.length > 0 && passwords.new1.length > 0) {
      try {
        // Monta o objeto do usuário com a nova senha
        const updatedUser = {
          ...user,
          password: passwords.current,
          newPassword: passwords.new1,
        };

        const response = await fetch('https://updateuser-wxmeentkrq-uc.a.run.app', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedUser),
        });

        if (response.ok) {
          setModalVisible(false);
          setPasswords({ current: '', new1: '', new2: '' });
          Alert.alert('Sucesso', 'Senha alterada com sucesso!');
          setAuthUser(updatedUser); // Atualiza o usuário no contexto de autenticação
        } else {
          Alert.alert('Erro', 'Não foi possível atualizar a senha.');
        }
      } catch (error) {
        Alert.alert('Erro', 'Ocorreu um erro ao atualizar a senha.');
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
      Alert.alert('Erro', 'Verifique os campos e tente novamente.');
    }
  };

  // Logout mock
  const handleLogout = () => {
    Alert.alert('Logout', 'Você saiu da conta.');
    router.replace('/login');
  };

  const handleUpdateUser = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://updateuser-wxmeentkrq-uc.a.run.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({...user, password: authUser?.password }),
      });
      if (response.ok) {
        Alert.alert('Sucesso', 'Dados atualizados com sucesso!');
        setAuthUser(authUser); // Atualiza o usuário no contexto de autenticação
      } else {
        Alert.alert('Erro', 'Não foi possível atualizar os dados.');
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao atualizar os dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Botão de voltar */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={28} color="#007AFF" />
      </TouchableOpacity>

      {/* Imagem de perfil */}
      <View style={styles.profileImageContainer}>
        <Image source={{ uri: user.photo }} style={styles.profileImage} />
        <TouchableOpacity style={styles.editIcon} onPress={pickImage}>
          <Ionicons name="camera" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Campos editáveis */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          value={user.name}
          editable={editing.name}
          onChangeText={name => setUser({ ...user, name })}
          onBlur={() => setEditing({ ...editing, name: false })}
          onFocus={() => setEditing({ ...editing, name: true })}
        />
        {!editing.name && (
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing({ ...editing, name: true })}>
            <Ionicons name="pencil" size={18} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Telefone</Text>
        <TextInput
          style={styles.input}
          value={user.phone}
          editable={editing.phone}
          keyboardType="phone-pad"
          onChangeText={phone => setUser({ ...user, phone })}
          onBlur={() => setEditing({ ...editing, phone: false })}
          onFocus={() => setEditing({ ...editing, phone: true })}
        />
        {!editing.phone && (
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing({ ...editing, phone: true })}>
            <Ionicons name="pencil" size={18} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={user.email}
          editable={false} // <-- Torna o campo email desabilitado

        />
        {!editing.email && (
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing({ ...editing, email: true })}>
            <Ionicons name="pencil" size={18} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Botão para confirmar alterações */}
      <TouchableOpacity
        style={[styles.changePasswordBtn, { backgroundColor: '#28a745', marginTop: 24 }]}
        onPress={handleUpdateUser}
        disabled={loading}
      >
        <Text style={styles.changePasswordText}>{loading ? 'Salvando...' : 'Confirmar'}</Text>
      </TouchableOpacity>
      {/* Botão para trocar senha */}
      <TouchableOpacity style={styles.changePasswordBtn} onPress={() => setModalVisible(true)}>
        <Text style={styles.changePasswordText}>Trocar senha</Text>
      </TouchableOpacity>


      {/* Botão logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Modal de troca de senha */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Trocar senha</Text>
            <TextInput
              style={styles.input}
              placeholder="Senha atual"
              secureTextEntry
              value={passwords.current}
              onChangeText={current => setPasswords({ ...passwords, current })}
            />
            <TextInput
              style={styles.input}
              placeholder="Nova senha"
              secureTextEntry
              value={passwords.new1}
              onChangeText={new1 => setPasswords({ ...passwords, new1 })}
            />
            <TextInput
              style={styles.input}
              placeholder="Repita a nova senha"
              secureTextEntry
              value={passwords.new2}
              onChangeText={new2 => setPasswords({ ...passwords, new2 })}
            />
            <View style={styles.modalButtons}>
              <Button title="Cancelar" color="#888" onPress={() => setModalVisible(false)} />
              <Button title={loading ? "Salvando..." : "Confirmar"} color="#007AFF" onPress={handleChangePassword} disabled={loading} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  profileImageContainer: {
    marginTop: 24,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#eee',
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 10,
    backgroundColor: '#007AFF',
    borderRadius: 16,
    padding: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  fieldContainer: {
    width: '100%',
    marginBottom: 18,
    position: 'relative',
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#eee',
    paddingRight: 40,
  },
  editBtn: {
    position: 'absolute',
    right: 10,
    top: 34,
    padding: 4,
  },
  changePasswordBtn: {
    marginTop: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  changePasswordText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoutBtn: {
    marginTop: 24,
    backgroundColor: '#fff0f0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignSelf: 'stretch',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  logoutText: {
    color: '#ff4444',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    elevation: 5,
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  backBtn: {
    position: 'absolute',
    top: 32,
    left: 16,
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    elevation: 2,
  },
});
